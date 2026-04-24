const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { extract, status } = require("./controller");

const app = express();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 requests per window
  standardHeaders: true, 
  legacyHeaders: false,
  message: { message: "Muitas requisições deste IP. Tente novamente mais tarde." }
});

const allowedOrigins = [
  'http://localhost:4200',
  'https://jose-almir.github.io',
  'https://almirdev.com'
];

app.use(compression());
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acesso bloqueado pelo CORS'));
    }
  }
}));
app.use(express.json());
app.use('/api', limiter);

app.post("/api/status", status);
app.post("/api/extract", extract);

app.listen(process.env.PORT ?? 3000);
