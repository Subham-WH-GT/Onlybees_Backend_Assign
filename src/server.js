

require("dotenv").config();
const express = require("express");

const eventsRouter = require("./routes/events");
const bookingsRouter = require("./routes/bookings");

const app = express();
app.use(express.json());

app.get("/", (_req, res) => res.send("Ticket Booking API running"));

app.use("/events", eventsRouter);
app.use("/book", bookingsRouter);
app.use("/bookings", bookingsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(` Server running on http://localhost:${port}`);
});
