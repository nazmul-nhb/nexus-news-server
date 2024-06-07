import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post('/', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.TOKEN_SECRET);
    res.send({ token });
});

export default router;
