import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { corsOptions } from "./config.js";
import { verifyToken, verifyAdmin } from "./middlewares/auth.js";
import userRoutes from "./routes/users.js";
import articleRoutes from "./routes/articles.js";
import publisherRoutes from "./routes/publishers.js";
import tagRoutes from "./routes/tags.js";
import jwtRoutes from "./routes/jwt.js";
import paymentRoutes from "./routes/payment.js"
import { client, connectDB } from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: corsOptions }));
app.use(express.json());

// Routes
app.use('/users', userRoutes);
app.use('/articles', articleRoutes);
app.use('/publishers', publisherRoutes);
app.use('/tags', tagRoutes);
app.use('/jwt', jwtRoutes);
app.use('/payment', paymentRoutes);

app.get("/", (req, res) => {
    res.send("Nexus Server is Running!");
});

const run = async () => {
    await connectDB();

    app.listen(port, () => {
        console.log(`Nexus Server is Running on Port: ${port}`);
    });
};

run().catch(console.dir);
