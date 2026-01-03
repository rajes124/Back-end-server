const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    const db = client.db("Back-End-server");
    const productsCollection = db.collection("products");
    const usersCollection = db.collection("users");

    // ==================== ADD USER WITH AUTO ROLE FIELD ====================
    app.post("/users", async (req, res) => {
      try {
        const { uid, name, email, photoURL } = req.body;
        if (!uid || !email)
          return res.status(400).json({ message: "UID এবং Email প্রয়োজন" });

        const userExists = await usersCollection.findOne({ uid });
        if (userExists) {
          return res.json({ message: "User already exists", user: userExists });
        }

        const newUser = { 
          uid, 
          name, 
          email, 
          photoURL, 
          role: "user",           // <--- এই লাইনটা যোগ করো – সব নতুন user-এর জন্য auto role "user"
          createdAt: new Date() 
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({ message: "User created", user: newUser });
      } catch (error) {
        console.error("❌ User creation error:", error);
        res.status(500).json({ message: "Failed to create user" });
      }
    });

    // বাকি সব route তোমার আগের মতোই – কোনো change নেই
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.json(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      let query;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }
      const product = await productsCollection.findOne(query);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    });

    app.put("/products/import/:id", async (req, res) => {
      try {
        const { quantity, userId } = req.body;
        if (!quantity || quantity <= 0)
          return res.status(400).json({ message: "Invalid quantity" });
        if (!userId) return res.status(400).json({ message: "User ID required" });

        let query;
        try {
          query = { _id: new ObjectId(req.params.id) };
        } catch {
          query = { _id: req.params.id };
        }

        const product = await productsCollection.findOne(query);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const finalQuantity = Math.min(quantity, product.availableQuantity);
        if (finalQuantity <= 0)
          return res.status(400).json({ message: "Product out of stock" });

        const updatedProduct = await productsCollection.findOneAndUpdate(
          query,
          { $inc: { availableQuantity: -finalQuantity } },
          { returnDocument: "after" }
        );

        await usersCollection.updateOne(
          { uid: userId },
          {
            $setOnInsert: { uid: userId },
            $push: {
              imports: {
                productId: req.params.id,
                importedQuantity: finalQuantity,
                date: new Date(),
              },
            },
          },
          { upsert: true }
        );

        res.json({
          importedQuantity: finalQuantity,
          availableQuantity: updatedProduct.value.availableQuantity,
        });
      } catch (err) {
        console.error("❌ Import error:", err);
        res.status(500).json({ message: "Failed to import" });
      }
    });

    app.post("/products", async (req, res) => {
      try {
        const {
          productName,
          image,
          price,
          originCountry,
          rating,
          availableQuantity,
          userEmail,
        } = req.body;
        if (
          !productName ||
          !image ||
          !price ||
          !originCountry ||
          !rating ||
          !availableQuantity ||
          !userEmail
        )
          return res
            .status(400)
            .json({ message: "সব ফিল্ড পূরণ করতে হবে (userEmail সহ)" });

        const newProduct = {
          productName,
          image,
          price: Number(price),
          originCountry,
          rating: Number(rating),
          availableQuantity: Number(availableQuantity),
          userEmail,
          createdAt: new Date(),
        };
        const result = await productsCollection.insertOne(newProduct);
        res.status(201).json({ insertedId: result.insertedId, ...newProduct });
      } catch (error) {
        console.error("❌ Product insert error:", error);
        res.status(500).json({ message: "Failed to add product" });
      }
    });

    app.get("/my-imports/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const user = await usersCollection.findOne({ uid: userId });
        if (!user || !user.imports) return res.json([]);

        const importsDetailed = await Promise.all(
          user.imports.map(async (imp) => {
            if (!imp?.productId) return null;

            let query;
            try {
              query = { _id: new ObjectId(imp.productId) };
            } catch {
              query = { _id: imp.productId };
            }

            const product = await productsCollection.findOne(query);
            if (!product) return null;

            return {
              ...product,
              importedQuantity: imp.importedQuantity,
            };
          })
        );

        res.json(importsDetailed.filter(Boolean));
      } catch (err) {
        console.error("❌ Error fetching imports:", err);
        res.status(500).json({ message: "Failed to fetch imports" });
      }
    });

    app.delete("/my-imports/:userId/:productId", async (req, res) => {
      try {
        const { userId, productId } = req.params;
        await usersCollection.updateOne(
          { uid: userId },
          { $pull: { imports: { productId } } }
        );
        res.json({ message: "Import removed successfully" });
      } catch (err) {
        console.error("❌ Error removing import:", err);
        res.status(500).json({ message: "Failed to remove import" });
      }
    });

    app.get("/my-exports/:email", async (req, res) => {
      try {
        const email = req.params.email;
        if (!email) return res.status(400).json({ message: "User email required" });
        const result = await productsCollection
          .find({ userEmail: email })
          .toArray();
        res.json(result);
      } catch (error) {
        console.error("❌ MyExports fetch error:", error);
        res.status(500).json({ message: "Failed to fetch user's exports" });
      }
    });

    app.delete("/my-exports/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.deleteOne(query);
        if (result.deletedCount === 0)
          return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted successfully" });
      } catch (error) {
        console.error("❌ Delete error:", error);
        res.status(500).json({ message: "Failed to delete product" });
      }
    });

    app.put("/my-exports/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const {
          productName,
          image,
          price,
          originCountry,
          rating,
          availableQuantity,
        } = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            productName,
            image,
            price: Number(price),
            originCountry,
            rating: Number(rating),
            availableQuantity: Number(availableQuantity),
          },
        };
        const result = await productsCollection.updateOne(query, updateDoc);
        if (result.matchedCount === 0)
          return res.status(404).json({ message: "Product not found" });
        const updated = await productsCollection.findOne(query);
        res.json(updated);
      } catch (error) {
        console.error("❌ Update error:", error);
        res.status(500).json({ message: "Failed to update product" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("✅ Server is running successfully!"));

app.listen(port, () =>
  console.log(`🚀 Server running on http://localhost:${port}`)
);