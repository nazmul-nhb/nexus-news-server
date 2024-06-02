import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config();

const corsOptions = [
    'http://localhost:5173',
    'http://localhost:5174',
];

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors({ origin: corsOptions }));
app.use(express.json());



// MongoDB Codes:

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qmbsuxs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const run = async () => {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const userCollection = client.db("nexusDB").collection("users");
        // const newsCollection = client.db("nexusDB").collection("news");
        const publisherCollection = client.db("nexusDB").collection("publishers");
        const articleCollection = client.db("nexusDB").collection("articles");




        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            const imageExists = await userCollection.findOne({ profile_image: user.profile_image });

            // update profile image
            if (!imageExists) {
                const filter = { email: user.email };
                const options = { upsert: true };
                const updatedUser = { $set: { profile_image: user.profile_image } };
                const result = await userCollection.updateOne(filter, updatedUser, options);

                return res.send(result);
            }

            if (existingUser) {
                return res.send({ message: 'User Already exists,', insertedId: null })
            }

            const result = await userCollection.insertOne(user);

            res.send(result);
        })

        // post an article 
        app.post('/articles', async (req, res) => {
            const news = req.body;

            const result = await articleCollection.insertOne(news);

            res.send(result);
        })

        // get publishers
        app.get('/publishers', async (req, res) => {
            const result = await publisherCollection.find().toArray();

            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
    res.send("Nexus Server is Running!");
});

app.listen(port, () => {
    console.log(`Nexus Server is Running on Port: ${port}`);
});