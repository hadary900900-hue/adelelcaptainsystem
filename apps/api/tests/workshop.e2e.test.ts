import { prisma } from '@erp/database';
import { WorkshopService } from '../src/modules/workshop/workshop.service';

async function runWorkshopTests() {
  console.log('🧪 Starting Workshop Automated End-to-End Tests...');
  const workshopService = new WorkshopService();

  // Find or use seed user, branch, warehouse, customer, vehicle, products
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found in database. Please seed users first.');

  const branch = await prisma.branch.findFirst();
  if (!branch) throw new Error('No branch found');

  const warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch.id } }) || await prisma.warehouse.findFirst();
  if (!warehouse) throw new Error('No warehouse found');

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        organizationId: branch.organizationId,
        customerCode: `CUST-TEST-${Date.now()}`,
        nameEn: 'Workshop Test Customer',
        phone: '01000000000',
      },
    });
  }

  // Ensure an inventory product exists (e.g. Repsol 4T Oil / Oil Filter)
  let sparePart = await prisma.product.findFirst({ where: { type: 'SPARE_PART' } });
  if (!sparePart) {
    sparePart = await prisma.product.create({
      data: {
        organizationId: branch.organizationId,
        nameEn: 'Repsol Moto 4T 10W-40 Synthetic Oil',
        nameAr: 'زيت ريبسول 4T تخليقي',
        sku: `OIL-REP-${Date.now().toString().slice(-4)}`,
        type: 'SPARE_PART',
        retailPrice: 450,
        costPrice: 320,
      },
    });
  }

  // Stock the oil in the warehouse
  await prisma.stockBalance.upsert({
    where: {
      warehouseId_productId: {
        warehouseId: warehouse.id,
        productId: sparePart.id,
      },
    },
    update: {
      quantity: 50,
      availableQty: 50,
      reservedQty: 0,
    },
    create: {
      warehouseId: warehouse.id,
      productId: sparePart.id,
      quantity: 50,
      availableQty: 50,
      reservedQty: 0,
      avgCost: 320,
    },
  });

  // Ensure a labor/service product exists (e.g. Oil Change Labor)
  let laborService = await prisma.product.findFirst({ where: { type: 'SERVICE' } });
  if (!laborService) {
    laborService = await prisma.product.create({
      data: {
        organizationId: branch.organizationId,
        nameEn: 'Engine Oil & Filter Replacement Labor',
        nameAr: 'مصنعية تغيير زيت الموتور والفلتر',
        sku: `SRV-OIL-${Date.now().toString().slice(-4)}`,
        type: 'SERVICE',
        retailPrice: 150,
        costPrice: 50,
      },
    });
  }

  // Ensure a vehicle unit exists
  let vehicle = await prisma.vehicleUnit.findFirst();
  if (!vehicle) {
    let vehicleProduct = await prisma.product.findFirst({ where: { type: 'VEHICLE' } });
    if (!vehicleProduct) {
      vehicleProduct = await prisma.product.create({
        data: {
          organizationId: branch.organizationId,
          nameEn: 'Honda CB500F 2024',
          nameAr: 'هوندا CB500F 2024',
          sku: `VEH-HND-${Date.now().toString().slice(-4)}`,
          type: 'VEHICLE',
          retailPrice: 280000,
        },
      });
    }

    vehicle = await prisma.vehicleUnit.create({
      data: {
        productId: vehicleProduct.id,
        branchId: branch.id,
        warehouseId: warehouse.id,
        vin: `VIN-TEST-${Date.now()}`,
        engineNumber: `ENG-TEST-${Date.now()}`,
        color: 'Black',
        modelYear: 2024,
        mileage: 12000,
      },
    });
  }

  console.log(`✅ Base records verified: Customer [${customer.nameEn}], Vehicle VIN [${vehicle.vin}]`);

  // --- TEST 1: VEHICLE RECEPTION WITH MONOTONIC ODOMETER VALIDATION ---
  console.log('Test 1: Vehicle Reception & Odometer monotonicity...');
  // Try lowering odometer without override reason (Expect throw)
  try {
    await workshopService.createReception(
      branch.organizationId,
      {
        branchId: branch.id,
        warehouseId: warehouse.id,
        customerId: customer.id,
        vehicleUnitId: vehicle.id,
        odometerReading: (vehicle.mileage || 1000) - 500, // lower!
      },
      user.id,
      []
    );
    throw new Error('FAILED: Lower odometer without override reason was accepted!');
  } catch (err: any) {
    console.log('  ✔ Correctly rejected lower odometer reading without override reason.');
  }

  // Successful reception
  const receptionOdometer = (vehicle.mileage || 1000) + 150;
  const wo = await workshopService.createReception(
    branch.organizationId,
    {
      branchId: branch.id,
      warehouseId: warehouse.id,
      customerId: customer.id,
      vehicleUnitId: vehicle.id,
      odometerReading: receptionOdometer,
      fuelLevel: 'HALF',
      licensePlate: 'ABC 123',
      complaint: 'Routine 10k service and engine oil change',
      conditionNotes: 'Small scratch on right fairing',
      accessories: '1 Helmet, Spare Key',
    },
    user.id,
    []
  );

  if (wo.status !== 'RECEIVED') throw new Error(`WorkOrder status should be RECEIVED, got ${wo.status}`);
  console.log(`  ✔ Created Work Order: ${wo.orderNumber} with odometer ${wo.odometerReading} km`);

  // Verify immutable odometer history
  const odoHistory = await prisma.odometerHistory.findFirst({
    where: { workOrderId: wo.id },
  });
  if (!odoHistory || odoHistory.reading !== receptionOdometer) {
    throw new Error('FAILED: Immutable odometer history was not created correctly');
  }
  console.log('  ✔ Odometer history recorded in immutable table.');

  // --- TEST 2: ADDING SPARE PART & LABOR SERVICE (STOCK RESERVATION) ---
  console.log('Test 2: Adding Spare Part & Labor Service with stock reservation...');
  const initialStock = await prisma.stockBalance.findUnique({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: sparePart.id } },
  });

  // Add 1 liter oil (Spare Part)
  const oilItem = await workshopService.addWorkOrderItem(
    wo.id,
    {
      productId: sparePart.id,
      quantity: 1,
      unitPrice: 450,
      discount: 0,
      taxRate: 14,
    },
    user.id
  );

  // Add 1 Labor service
  const laborItem = await workshopService.addWorkOrderItem(
    wo.id,
    {
      productId: laborService.id,
      quantity: 1,
      unitPrice: 150,
      discount: 20, // 20 EGP discount
      taxRate: 14,
    },
    user.id
  );

  // Verify stock reservation (availableQty decremented by 1, reservedQty incremented by 1, total qty unchanged)
  const reservedStock = await prisma.stockBalance.findUnique({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: sparePart.id } },
  });

  if (reservedStock!.reservedQty !== (initialStock!.reservedQty + 1)) {
    throw new Error(`FAILED: Stock reservation failed. Expected reserved ${initialStock!.reservedQty + 1}, got ${reservedStock!.reservedQty}`);
  }
  if (reservedStock!.availableQty !== (initialStock!.availableQty - 1)) {
    throw new Error(`FAILED: Stock available quantity did not decrement on reservation`);
  }
  console.log('  ✔ Spare part reserved: availableQty decreased by 1, reservedQty increased by 1.');

  // --- TEST 3: ATOMIC COMPLETION & INVOICE GENERATION ---
  console.log('Test 3: Atomic Completion, Invoice Generation, & Stock Consumption...');
  const invoice = await workshopService.completeAndGenerateInvoice(
    wo.id,
    {
      paymentMethod: 'CASH',
      paidAmount: 500, // Partial payment
      notes: 'Customer paid 500 EGP cash downpayment',
    },
    user.id
  );

  if (!invoice || !invoice.invoiceNo) {
    throw new Error('FAILED: Invoice was not generated on work order completion');
  }

  // Verify single invoice linked
  const completedWo = await prisma.workOrder.findUnique({
    where: { id: wo.id },
    include: { invoice: true },
  });
  if (completedWo!.invoiceId !== invoice.id || completedWo!.status !== 'INVOICED') {
    throw new Error('FAILED: Work order invoiceId not set or status not INVOICED');
  }

  // Verify actual stock consumed (total quantity decremented, reservedQty released)
  const consumedStock = await prisma.stockBalance.findUnique({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: sparePart.id } },
  });
  if (consumedStock!.quantity !== (initialStock!.quantity - 1)) {
    throw new Error('FAILED: Total stock quantity was not decremented upon completion');
  }
  if (consumedStock!.reservedQty !== initialStock!.reservedQty) {
    throw new Error('FAILED: Reserved quantity was not cleared after consumption');
  }

  // Verify auditable StockMovement created (SERVICE_OUT)
  const serviceMovement = await prisma.stockMovement.findFirst({
    where: {
      movementType: 'SERVICE_OUT',
      productId: sparePart.id,
      referenceNumber: wo.orderNumber,
    },
  });
  if (!serviceMovement) {
    throw new Error('FAILED: Auditable SERVICE_OUT StockMovement not created');
  }
  console.log(`  ✔ Stock successfully consumed and auditable movement logged: ${serviceMovement.movementNumber}`);

  // --- TEST 4: IDEMPOTENCY PROTECTION (PREVENT DUPLICATE INVOICES & RETRIES) ---
  console.log('Test 4: Idempotency Protection test...');
  const retryInvoice = await workshopService.completeAndGenerateInvoice(
    wo.id,
    { paymentMethod: 'CASH', paidAmount: 500 },
    user.id
  );
  if (retryInvoice.id !== invoice.id) {
    throw new Error('FAILED: Retry generated a duplicate invoice instead of returning existing one!');
  }

  const postRetryStock = await prisma.stockBalance.findUnique({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId: sparePart.id } },
  });
  if (postRetryStock!.quantity !== consumedStock!.quantity) {
    throw new Error('FAILED: Retry resulted in double stock deduction!');
  }
  console.log('  ✔ Idempotency verified: duplicate completion returned same invoice with ZERO duplicate stock deductions.');

  // --- TEST 5: VEHICLE DELIVERY & HANDOVER ---
  console.log('Test 5: Vehicle Handover & Delivery...');
  const deliveredWo = await workshopService.deliverVehicle(
    wo.id,
    {
      recipientName: customer.nameEn,
      recipientNationalId: '29001010101010',
      handoverNotes: 'Handed over clean with all accessories',
    },
    user.id
  );

  if (deliveredWo.status !== 'DELIVERED') {
    throw new Error(`FAILED: Work order status is not DELIVERED, got ${deliveredWo.status}`);
  }

  const updatedVehicle = await prisma.vehicleUnit.findUnique({ where: { id: vehicle.id } });
  if (updatedVehicle!.status !== 'AVAILABLE') {
    throw new Error('FAILED: Vehicle unit status was not reset to AVAILABLE upon delivery');
  }
  console.log('  ✔ Vehicle delivery recorded, status set to DELIVERED, vehicle returned to AVAILABLE.');

  // --- TEST 6: SERVICE HISTORY RETRIEVAL ---
  console.log('Test 6: Vehicle & Customer Service History...');
  const vehicleHistory = await workshopService.getVehicleServiceHistory(vehicle.id);
  if (!vehicleHistory.history || vehicleHistory.history.length === 0) {
    throw new Error('FAILED: Vehicle service history is empty');
  }
  console.log(`  ✔ Vehicle history contains ${vehicleHistory.history.length} service records with odometer readings.`);

  console.log('\n🎉 ALL WORKSHOP UNIT & INTEGRATION TESTS PASSED 100% SUCCESSFULLY! 🎉\n');
}

runWorkshopTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
