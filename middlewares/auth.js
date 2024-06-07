import jwt from "jsonwebtoken";
import { userCollection } from "../db.js";

export const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access!' });
    }

    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: 'Unauthorized Access!' });
        }
        req.user = decoded;
        next();
    });
};

export const verifyAdmin = async (req, res, next) => {
    const user = req.user;
    const query = { email: user?.email };
    const result = await userCollection.findOne(query);

    // console.log(result?.role);

    if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'Unauthorized Access!' });

    next();
};
