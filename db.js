import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qmbsuxs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
export const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export const userCollection = client.db("nexusDB").collection("users");
export const publisherCollection = client.db("nexusDB").collection("publishers");
export const articleCollection = client.db("nexusDB").collection("articles");
export const tagCollection = client.db("nexusDB").collection("tags");
export const paymentCollection = client.db("nexusDB").collection("payments");

export const connectDB = async () => {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Successfully Connected to MongoDB!");
    } catch (error) {
        console.error("Failed to Connect to MongoDB", error);
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
};
