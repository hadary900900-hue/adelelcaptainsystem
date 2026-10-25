import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class InventoryService {
  async getStockBalances(orgId: string, { warehouseId, productId, search, skip, limit }: any) {
    const where: any = {
      product: { organizationId: orgId },
    };
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
      where.product.OR = [
        { sku: { contains: search } },
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.stockBalance.count({ where }),
      prisma.stockBalance.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { include: { brand: true, category: true } },
          warehouse: { include: { branch: true } },
          location: true,
        },
        orderBy: { quantity: 'desc' },
      }),
    ]);

    return { total, data };
  }

  async getMovements(orgId: string, { warehouseId, productId, type, search, skip, limit }: any) {
    const where: any = {
      product: { organizationId: orgId },
    };
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (type) where.movementType = type;
    if (search) {
      where.OR = [
        { movementNumber: { contains: search } },
        { referenceNumber: { contains: search } },
        { product: { sku: { contains: search } } },
        { product: { nameEn: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          warehouse: true,
          branch: true,
          vehicleUnit: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  // Stock Transfer
  async listTransfers(orgId: string, { skip, limit, status }: any) {
    const where: any = {
      sourceWarehouse: { branch: { organizationId: orgId } },
    };
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
          items: { include: { product: true, vehicleUnit: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, data };
  }

  async createTransfer(data: any, userId: string) {
    if (data.sourceWarehouseId === data.targetWarehouseId) {
      throw new AppError('Source and target warehouse cannot be the same', 400);
    }

    const sourceWarehouse = await prisma.warehouse.findUnique({
      where: { id: data.sourceWarehouseId },
      include: { branch: true },
    });
    const targetWarehouse = await prisma.warehouse.findUnique({
      where: { id: data.targetWarehouseId },
      include: { branch: true },
    });

    if (!sourceWarehouse || !targetWarehouse) throw new AppError('Warehouse not found', 404);

    return prisma.$transaction(async (tx) => {
      // Check stock availability & validate vehicle units if specified
      for (const item of data.items) {
        // For VEHICLE items with specific unit IDs, validate each unit
        if (item.vehicleUnitIds && item.vehicleUnitIds.length > 0) {
          for (const vuId of item.vehicleUnitIds) {
            const vu = await tx.vehicleUnit.findUnique({ where: { id: vuId } });
            if (!vu) throw new AppError(`Vehicle unit ${vuId} not found`, 404);
            if (vu.warehouseId !== data.sourceWarehouseId) throw new AppError(`Vehicle unit VIN ${vu.vin} does not belong to source warehouse`, 400);
            if (vu.status !== 'AVAILABLE') throw new AppError(`Vehicle unit VIN ${vu.vin} is not available (status: ${vu.status})`, 400);
          }
        } else {
          // Regular stock check
          const balance = await tx.stockBalance.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: data.sourceWarehouseId,
                productId: item.productId,
              },
            },
            include: { product: true },
          });

          const currentQty = balance ? balance.quantity : 0;
          const allowNeg = balance?.product.allowNegativeStock || false;

          if (!allowNeg && currentQty < item.requestedQty) {
            throw new AppError(
              `Insufficient stock for product ${balance?.product.nameEn || item.productId} in ${sourceWarehouse.nameEn}. Available: ${currentQty}, Requested: ${item.requestedQty}`,
              400
            );
          }
        }
      }

      const transferNumber = `TRF-${Date.now()}`;
      // Build transfer items: if vehicleUnitIds provided, create one row per unit
      const transferItemsToCreate: any[] = [];
      for (const item of data.items) {
        if (item.vehicleUnitIds && item.vehicleUnitIds.length > 0) {
          for (const vuId of item.vehicleUnitIds) {
            transferItemsToCreate.push({
              productId: item.productId,
              vehicleUnitId: vuId,
              requestedQty: 1,
              shippedQty: 1,
              receivedQty: 0,
              unitCost: item.unitCost || 0,
              notes: item.notes,
            });
          }
        } else {
          transferItemsToCreate.push({
            productId: item.productId,
            vehicleUnitId: null,
            requestedQty: item.requestedQty,
            shippedQty: item.requestedQty,
            receivedQty: 0,
            unitCost: item.unitCost || 0,
            notes: item.notes,
          });
        }
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          sourceWarehouseId: data.sourceWarehouseId,
          targetWarehouseId: data.targetWarehouseId,
          status: 'PENDING',
          notes: data.notes,
          createdById: userId,
          items: { create: transferItemsToCreate },
        },
        include: { items: true },
      });

      // Reserve stock in source warehouse
      for (const item of data.items) {
        const qty = (item.vehicleUnitIds && item.vehicleUnitIds.length > 0)
          ? item.vehicleUnitIds.length
          : (item.requestedQty || 1);
        await tx.stockBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: data.sourceWarehouseId,
              productId: item.productId,
            },
          },
          update: {
            availableQty: { decrement: qty },
            reservedQty: { increment: qty },
          },
          create: {
            warehouseId: data.sourceWarehouseId,
            productId: item.productId,
            quantity: 0,
            availableQty: -qty,
            reservedQty: qty,
          },
        });
      }

      createAuditLog({
        userId,
        branchId: sourceWarehouse.branchId,
        entityType: 'StockTransfer',
        entityId: transfer.id,
        action: 'create',
        afterData: transfer,
      });

      return transfer;
    });
  }

  async acceptTransfer(id: string, userId: string, userPermissions: string[] = []) {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, vehicleUnit: true } },
        sourceWarehouse: { include: { branch: true } },
        targetWarehouse: { include: { branch: true } },
      },
    });

    if (!transfer) throw new AppError('Stock transfer not found', 404);
    if (transfer.status !== 'PENDING') {
      throw new AppError(`Transfer cannot be accepted in current status (${transfer.status})`, 400);
    }

    // Verify user belongs to target branch or is admin
    const isAdmin = userPermissions.includes('admin.all');
    if (!isAdmin) {
      const userBranch = await prisma.userBranch.findUnique({
        where: {
          userId_branchId: {
            userId,
            branchId: transfer.targetWarehouse.branchId,
          },
        },
      });

      if (!userBranch) {
        throw new AppError(
          `Permission denied: Only staff assigned to destination branch (${transfer.targetWarehouse.branch.nameEn}) can accept this transfer`,
          403
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Process source OUT & target IN
      for (const item of transfer.items) {
        // Source warehouse: deduct quantity & release reserved
        const srcBal = await tx.stockBalance.update({
          where: {
            warehouseId_productId: {
              warehouseId: transfer.sourceWarehouseId,
              productId: item.productId,
            },
          },
          data: {
            quantity: { decrement: item.requestedQty },
            reservedQty: { decrement: item.requestedQty },
          },
        });

        await tx.stockMovement.create({
          data: {
            movementNumber: `MOV-TRF-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            movementType: 'TRANSFER_OUT',
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            branchId: transfer.sourceWarehouse.branchId,
            quantity: item.requestedQty,
            unitCost: item.unitCost || 0,
            totalCost: (item.unitCost || 0) * item.requestedQty,
            beforeQuantity: srcBal.quantity + item.requestedQty,
            afterQuantity: srcBal.quantity,
            referenceType: 'TRANSFER',
            referenceNumber: transfer.transferNumber,
            referenceId: transfer.id,
            notes: `Transfer to ${transfer.targetWarehouse.nameEn}`,
            createdById: userId,
          },
        });

        // Target warehouse: add quantity & available
        const tgtBal = await tx.stockBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: transfer.targetWarehouseId,
              productId: item.productId,
            },
          },
          update: {
            quantity: { increment: item.requestedQty },
            availableQty: { increment: item.requestedQty },
          },
          create: {
            warehouseId: transfer.targetWarehouseId,
            productId: item.productId,
            quantity: item.requestedQty,
            availableQty: item.requestedQty,
            avgCost: item.unitCost || 0,
          },
        });

        await tx.stockMovement.create({
          data: {
            movementNumber: `MOV-TRF-IN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            movementType: 'TRANSFER_IN',
            productId: item.productId,
            warehouseId: transfer.targetWarehouseId,
            branchId: transfer.targetWarehouse.branchId,
            quantity: item.requestedQty,
            unitCost: item.unitCost || 0,
            totalCost: (item.unitCost || 0) * item.requestedQty,
            beforeQuantity: tgtBal.quantity - item.requestedQty,
            afterQuantity: tgtBal.quantity,
            referenceType: 'TRANSFER',
            referenceNumber: transfer.transferNumber,
            referenceId: transfer.id,
            notes: `Received transfer from ${transfer.sourceWarehouse.nameEn}`,
            createdById: userId,
          },
        });

        // Update item received qty
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQty: item.requestedQty },
        });

        // Automatically transfer VehicleUnits (scooters/motorcycles) from source warehouse to target warehouse & branch
        if (item.product?.type === 'VEHICLE') {
          if (item.vehicleUnitId) {
            // Specific unit was selected at transfer creation — move exactly that unit
            await tx.vehicleUnit.update({
              where: { id: item.vehicleUnitId },
              data: {
                branchId: transfer.targetWarehouse.branchId,
                warehouseId: transfer.targetWarehouseId,
              },
            });
          } else {
            // No specific unit — move the first available unit (legacy fallback)
            const unit = await tx.vehicleUnit.findFirst({
              where: {
                productId: item.productId,
                warehouseId: transfer.sourceWarehouseId,
                status: 'AVAILABLE',
              },
            });
            if (unit) {
              await tx.vehicleUnit.update({
                where: { id: unit.id },
                data: {
                  branchId: transfer.targetWarehouse.branchId,
                  warehouseId: transfer.targetWarehouseId,
                },
              });
            }
          }
        }
      }

      // Mark transfer completed
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          receivedDate: new Date(),
        },
      });

      createAuditLog({
        userId,
        branchId: transfer.targetWarehouse.branchId,
        entityType: 'StockTransfer',
        entityId: id,
        action: 'accept',
        afterData: updatedTransfer,
      });

      return updatedTransfer;
    });
  }

  async cancelTransfer(id: string, userId: string) {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true, sourceWarehouse: true },
    });
    if (!transfer) throw new AppError('Transfer not found', 404);
    if (transfer.status !== 'PENDING') throw new AppError('Only PENDING transfers can be cancelled', 400);

    return prisma.$transaction(async (tx) => {
      // Release source reservations
      for (const item of transfer.items) {
        await tx.stockBalance.update({
          where: {
            warehouseId_productId: {
              warehouseId: transfer.sourceWarehouseId,
              productId: item.productId,
            },
          },
          data: {
            availableQty: { increment: item.requestedQty },
            reservedQty: { decrement: item.requestedQty },
          },
        });
      }

      const cancelled = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      createAuditLog({
        userId,
        branchId: transfer.sourceWarehouse.branchId,
        entityType: 'StockTransfer',
        entityId: id,
        action: 'cancel',
      });

      return cancelled;
    });
  }

  // Stock Adjustment
  async listAdjustments(orgId: string, { skip, limit }: any) {
    const where: any = {
      warehouse: { branch: { organizationId: orgId } },
    };
    const [total, data] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
        where,
        skip,
        take: limit,
        include: {
          warehouse: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
          items: { include: { product: true, vehicleUnit: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, data };
  }

  async createAdjustment(data: any, userId: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
      include: { branch: true },
    });
    if (!warehouse) throw new AppError('Warehouse not found', 404);

    return prisma.$transaction(async (tx) => {
      const adjustmentNumber = `ADJ-${Date.now()}`;
      const itemsData = [];

      for (const item of data.items) {
        const balance = await tx.stockBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: data.warehouseId,
              productId: item.productId,
            },
          },
          include: { product: true },
        });

        const currentQty = balance ? balance.quantity : 0;
        const diff = item.countedQty - currentQty;
        const unitCost = balance?.product.costPrice || 0;

        itemsData.push({
          productId: item.productId,
          systemQty: currentQty,
          countedQty: item.countedQty,
          difference: diff,
          unitCost,
          notes: item.notes,
        });

        // Update Stock Balance to exactly the counted quantity
        await tx.stockBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: data.warehouseId,
              productId: item.productId,
            },
          },
          update: {
            quantity: item.countedQty,
            availableQty: item.countedQty,
          },
          create: {
            warehouseId: data.warehouseId,
            productId: item.productId,
            quantity: item.countedQty,
            availableQty: item.countedQty,
            avgCost: unitCost,
          },
        });

        // Create Stock Movement record for Adjustment
        if (diff !== 0) {
          const moveType = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
          await tx.stockMovement.create({
            data: {
              movementNumber: `MOV-ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              movementType: moveType,
              productId: item.productId,
              warehouseId: data.warehouseId,
              branchId: warehouse.branchId,
              quantity: Math.abs(diff),
              unitCost,
              totalCost: Math.abs(diff) * unitCost,
              beforeQuantity: currentQty,
              afterQuantity: item.countedQty,
              referenceType: 'ADJUSTMENT',
              referenceNumber: adjustmentNumber,
              notes: `Adjustment reason: ${data.reason}`,
              createdById: userId,
            },
          });
        }
      }

      const adjustment = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          warehouseId: data.warehouseId,
          reason: data.reason,
          notes: data.notes,
          createdById: userId,
          items: {
            create: itemsData,
          },
        },
        include: { items: true },
      });

      createAuditLog({
        userId,
        branchId: warehouse.branchId,
        entityType: 'StockAdjustment',
        entityId: adjustment.id,
        action: 'create',
        afterData: adjustment,
      });

      return adjustment;
    });
  }

  // Stock Counts
  async listCounts(orgId: string, { skip, limit }: any) {
    const where: any = {
      warehouse: { branch: { organizationId: orgId } },
    };
    const [total, data] = await Promise.all([
      prisma.stockCount.count({ where }),
      prisma.stockCount.findMany({
        where,
        skip,
        take: limit,
        include: {
          warehouse: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true } },
          items: { include: { product: true, vehicleUnit: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, data };
  }

  async createCount(data: any, userId: string) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw new AppError('Warehouse not found', 404);

    const countNumber = `CNT-${Date.now()}`;
    const count = await prisma.stockCount.create({
      data: {
        countNumber,
        warehouseId: data.warehouseId,
        notes: data.notes,
        createdById: userId,
        status: 'IN_PROGRESS',
      },
    });

    createAuditLog({
      userId,
      entityType: 'StockCount',
      entityId: count.id,
      action: 'create',
      afterData: count,
    });

    return count;
  }

  // Stock Balance Direct Edit & Delete
  async updateStockBalance(id: string, data: { quantity: number; avgCost?: number; notes?: string }, userId: string) {
    const balance = await prisma.stockBalance.findUnique({
      where: { id },
      include: { product: true, warehouse: { include: { branch: true } } },
    });
    if (!balance) throw new AppError('Stock balance not found', 404);

    const oldQty = balance.quantity;
    const newQty = Number(data.quantity);
    const diff = newQty - oldQty;

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.stockBalance.update({
        where: { id },
        data: {
          quantity: newQty,
          availableQty: Math.max(0, newQty - balance.reservedQty),
          avgCost: data.avgCost !== undefined ? Number(data.avgCost) : balance.avgCost,
        },
      });

      // Audit stock movement for correction
      if (diff !== 0) {
        await tx.stockMovement.create({
          data: {
            movementNumber: `MOV-ADJ-${Date.now()}`,
            movementType: 'MANUAL_ADJUSTMENT',
            productId: balance.productId,
            warehouseId: balance.warehouseId,
            branchId: balance.warehouse.branchId,
            quantity: Math.abs(diff),
            unitCost: data.avgCost !== undefined ? Number(data.avgCost) : balance.avgCost,
            totalCost: Math.abs(diff) * (data.avgCost !== undefined ? Number(data.avgCost) : balance.avgCost),
            beforeQuantity: oldQty,
            afterQuantity: newQty,
            referenceType: 'MANUAL_EDIT',
            referenceNumber: `BAL:${id}`,
            notes: data.notes || `Manual balance update by operator: ${oldQty} -> ${newQty}`,
            createdById: userId,
          },
        });
      }

      return up;
    });

    createAuditLog({
      userId,
      entityType: 'StockBalance',
      entityId: id,
      action: 'update',
      beforeData: balance,
      afterData: updated,
    });

    return updated;
  }

  async deleteStockBalance(id: string, userId: string) {
    const balance = await prisma.stockBalance.findUnique({
      where: { id },
      include: { warehouse: true },
    });
    if (!balance) throw new AppError('Stock balance not found', 404);

    await prisma.$transaction(async (tx) => {
      // Create movement to zero out if quantity > 0
      if (balance.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            movementNumber: `MOV-ZERO-${Date.now()}`,
            movementType: 'MANUAL_ADJUSTMENT',
            productId: balance.productId,
            warehouseId: balance.warehouseId,
            branchId: balance.warehouse.branchId,
            quantity: balance.quantity,
            unitCost: balance.avgCost,
            totalCost: balance.quantity * balance.avgCost,
            beforeQuantity: balance.quantity,
            afterQuantity: 0,
            referenceType: 'BALANCE_DELETE',
            referenceNumber: `BAL:${id}`,
            notes: `Stock balance record deleted/zeroed out`,
            createdById: userId,
          },
        });
      }

      await tx.stockBalance.delete({ where: { id } });
    });

    createAuditLog({
      userId,
      entityType: 'StockBalance',
      entityId: id,
      action: 'delete',
    });
  }

  async getVehicleUnits(orgId: string, { branchId, warehouseId, status, search, skip, limit }: any) {
    const where: any = {
      branch: { organizationId: orgId },
    };
    if (branchId) where.branchId = branchId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { vin: { contains: search } },
        { engineNumber: { contains: search } },
        { color: { contains: search } },
        { product: { nameEn: { contains: search } } },
        { product: { nameAr: { contains: search } } },
        { model: { nameEn: { contains: search } } },
        { model: { nameAr: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.vehicleUnit.count({ where }),
      prisma.vehicleUnit.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { include: { brand: true, category: true } },
          model: true,
          branch: true,
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, data };
  }

  // ==================== STOCK ORDERS ====================

  async listStockOrders(orgId: string, { skip, limit, status, branchId }: any) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;

    const [total, data] = await Promise.all([
      prisma.stockOrder.count({ where }),
      prisma.stockOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: true,
          warehouse: true,
          createdBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
          confirmedBy: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, data };
  }

  async createStockOrder(data: any, userId: string, orgId: string) {
    // Fetch current stock balances for the warehouse, filtered below threshold
    const threshold = Number(data.thresholdQty) || 0;
    const warehouseId = data.warehouseId;

    let itemsToOrder = data.items; // user can pass explicit items OR we auto-detect

    if (!itemsToOrder || itemsToOrder.length === 0) {
      // Auto-detect: products below threshold in the given warehouse
      const balances = await prisma.stockBalance.findMany({
        where: {
          warehouseId,
          product: { organizationId: orgId, isActive: true },
          ...(threshold > 0 ? { quantity: { lt: threshold } } : {}),
        },
        include: { product: true },
        take: 200,
      });
      itemsToOrder = balances.map((b: any) => ({
        productId: b.productId,
        currentQty: b.quantity,
        requestedQty: threshold > 0 ? Math.max(1, threshold - b.quantity) : 1,
      }));
    }

    if (itemsToOrder.length === 0) {
      throw new AppError('No items below the threshold in this warehouse', 400);
    }

    const orderNumber = `SO-${Date.now()}`;
    const order = await prisma.stockOrder.create({
      data: {
        orderNumber,
        organizationId: orgId,
        branchId: data.branchId,
        warehouseId,
        thresholdQty: threshold,
        notes: data.notes,
        createdById: userId,
        status: 'PENDING',
        items: {
          create: itemsToOrder.map((it: any) => ({
            productId: it.productId,
            currentQty: it.currentQty || 0,
            requestedQty: it.requestedQty || 1,
            notes: it.notes,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        branch: true,
        warehouse: true,
        createdBy: { select: { firstNameEn: true, lastNameEn: true } },
      },
    });

    createAuditLog({ userId, branchId: data.branchId, entityType: 'StockOrder', entityId: order.id, action: 'create', afterData: order });
    return order;
  }

  async confirmStockOrder(id: string, userId: string, action: 'CONFIRMED' | 'REJECTED') {
    const order = await prisma.stockOrder.findUnique({ where: { id } });
    if (!order) throw new AppError('Stock order not found', 404);
    if (order.status !== 'PENDING') throw new AppError(`Order is already ${order.status}`, 400);

    const updated = await prisma.stockOrder.update({
      where: { id },
      data: {
        status: action,
        confirmedById: userId,
        confirmedAt: new Date(),
      },
      include: {
        items: { include: { product: true } },
        branch: true,
        warehouse: true,
        createdBy: { select: { firstNameEn: true, lastNameEn: true } },
        confirmedBy: { select: { firstNameEn: true, lastNameEn: true } },
      },
    });

    createAuditLog({ userId, branchId: order.branchId, entityType: 'StockOrder', entityId: id, action: action.toLowerCase(), afterData: updated });
    return updated;
  }

  async getLowStockItems(orgId: string, { warehouseId, branchId, threshold }: any) {
    const thresholdQty = Number(threshold) || 5;
    const where: any = {
      product: { organizationId: orgId, isActive: true },
    };
    if (warehouseId) where.warehouseId = warehouseId;
    if (branchId) where.warehouse = { branchId };

    const balances = await prisma.stockBalance.findMany({
      where: { ...where, quantity: { lt: thresholdQty } },
      include: {
        product: { include: { category: true } },
        warehouse: { include: { branch: true } },
      },
      orderBy: { quantity: 'asc' },
      take: 200,
    });

    return balances;
  }
}
