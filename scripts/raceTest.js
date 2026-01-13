
const axios = require("axios");

const BASE_URL = "http://localhost:3000";


const EVENT_ID = "0853eb48-d05e-487a-8575-32627ca65e49";
const SECTION_ID = "5f1fd16b-3a87-47ce-a787-3992d4a71be6";

// Number of parallel requests
const TOTAL_REQUESTS = 13;

// Quantity per booking
const QTY_PER_BOOKING = 1;

async function sendBookingRequest(index) {
  try {
    const response = await axios.post(`${BASE_URL}/book`, {
      eventId: EVENT_ID,
      sectionId: SECTION_ID,
      qty: QTY_PER_BOOKING,
    });

    return {
      request: index,
      ok: true,
      httpStatus: response.status,
      data: response.data,
    };
  } catch (error) {
    return {
      request: index,
      ok: false,
      httpStatus: error.response?.status,
      error: error.response?.data || { error: error.message },
    };
  }
}

async function runRaceTest() {
  console.log("Starting race condition test...\n");
  console.log("Event:", EVENT_ID);
  console.log("Section:", SECTION_ID);
  console.log("Requests:", TOTAL_REQUESTS, "Qty each:", QTY_PER_BOOKING);

  // read initial remaining before race
  const beforeEvent = await axios.get(`${BASE_URL}/events/${EVENT_ID}`);
  const beforeSection = beforeEvent.data.sections.find((s) => s.id === SECTION_ID);
  if (!beforeSection) {
    console.error("Section ID not found under this event. Check EVENT_ID/SECTION_ID.");
    process.exit(1);
  }
  console.log("\nBefore:");
  console.log("Capacity:", beforeSection.capacity, "Remaining:", beforeSection.remaining);

  // Fire all requests concurrently
  const requests = Array.from({ length: TOTAL_REQUESTS }, (_, i) => sendBookingRequest(i + 1));
  const results = await Promise.all(requests);

  const success = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log("\n RESULTS");
  console.log("Successful bookings:", success.length);
  console.log("Failed bookings:", failed.length);

  
  console.log("\nFailed samples:");
  failed.slice(0, 10).forEach((f) => {
    console.log(` Req ${f.request} status=${f.httpStatus}`, f.error);
  });

  // Verify final remaining from API
  const afterEvent = await axios.get(`${BASE_URL}/events/${EVENT_ID}`);
  const afterSection = afterEvent.data.sections.find((s) => s.id === SECTION_ID);

  console.log("\nAfter:");
  console.log("Capacity:", afterSection.capacity, "Remaining:", afterSection.remaining);

  // Verify total booked from /bookings
  const bookingsRes = await axios.get(`${BASE_URL}/bookings`);
  const totalBooked = bookingsRes.data.bookings
    .filter((b) => b.section_id === SECTION_ID)
    .reduce((sum, b) => sum + b.qty, 0);

  console.log("Total booked for this section:", totalBooked);

  
  const inv1 = afterSection.remaining >= 0;
  const inv2 = totalBooked <= afterSection.capacity;

  console.log("\n Invariant checks:");
  console.log("remaining >= 0 ?", inv1);
  console.log("totalBooked <= capacity ?", inv2);

  if (!inv1 || !inv2) {
    console.error("\n FAILED: Oversell or invalid remaining detected!");
    process.exit(2);
  }

  console.log("\n PASSED: No overselling under concurrency.");
}

runRaceTest().catch((e) => {
  console.error(" Script crashed:", e?.response?.data || e.message);
  process.exit(1);
});
