const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

const User = require("../models/User");
const Listing = require("../models/Listing");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farmkonnect";

const dummyListings = [
  // Crops
  {
    title: "Premium Wheat - High Quality",
    description: "Fresh harvest wheat from Punjab region. Excellent for flour production. Moisture content below 12%. Clean and sorted.",
    price: 4500,
    category: "crops",
    location: "Lahore, Punjab",
    quantity: 500,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800"],
  },
  {
    title: "Basmati Rice - Export Quality",
    description: "Authentic Super Basmati rice, long grain, aromatic. Perfect for biryani and pulao. Aged for 1 year.",
    price: 8500,
    category: "crops",
    location: "Gujranwala, Punjab",
    quantity: 200,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800"],
  },
  {
    title: "Fresh Maize - Yellow Corn",
    description: "High protein yellow maize suitable for animal feed and corn flour. Harvested this season.",
    price: 3200,
    category: "crops",
    location: "Faisalabad, Punjab",
    quantity: 1000,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800"],
  },
  {
    title: "Cotton Bales - Premium Grade",
    description: "High quality cotton bales from Sindh. Clean fiber, excellent for textile industry. Staple length 28mm+.",
    price: 25000,
    category: "crops",
    location: "Multan, Punjab",
    quantity: 50,
    unit: "bales",
    images: ["https://images.unsplash.com/photo-1616431101491-554c0932ea40?w=800"],
  },
  {
    title: "Sugarcane - Fresh Cut",
    description: "Fresh sugarcane ready for processing. High sucrose content. Direct from farm.",
    price: 280,
    category: "crops",
    location: "Rahim Yar Khan, Punjab",
    quantity: 5000,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800"],
  },
  {
    title: "Red Chillies - Dried",
    description: "Premium quality dried red chillies from Kunri. High color value, perfect for spices.",
    price: 850,
    category: "crops",
    location: "Kunri, Sindh",
    quantity: 100,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=800"],
  },
  {
    title: "Potatoes - Fresh Harvest",
    description: "Fresh potatoes from Okara region. Clean, sorted by size. Suitable for chips and cooking.",
    price: 120,
    category: "crops",
    location: "Okara, Punjab",
    quantity: 2000,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1518977676601-b53f82ber6eb?w=800"],
  },
  {
    title: "Onions - Red Premium",
    description: "Fresh red onions, large size, no sprouting. Long shelf life. Farm fresh quality.",
    price: 180,
    category: "crops",
    location: "Hyderabad, Sindh",
    quantity: 1500,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800"],
  },
  
  // Livestock
  {
    title: "Sahiwal Cow - Milking",
    description: "Healthy Sahiwal breed cow, 4 years old. Producing 15 liters milk daily. All vaccinations complete.",
    price: 350000,
    category: "livestock",
    location: "Sahiwal, Punjab",
    quantity: 1,
    unit: "head",
    images: ["https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=800"],
  },
  {
    title: "Beetal Goats - Pair",
    description: "Pure Beetal breed goats, male and female pair. Excellent for breeding. Age 2 years.",
    price: 85000,
    category: "livestock",
    location: "Sargodha, Punjab",
    quantity: 2,
    unit: "head",
    images: ["https://images.unsplash.com/photo-1524024973431-2ad916746881?w=800"],
  },
  {
    title: "Buffalo - Nili Ravi",
    description: "Premium Nili Ravi buffalo, 3rd lactation. Producing 18 liters milk daily. Healthy and active.",
    price: 450000,
    category: "livestock",
    location: "Sheikhupura, Punjab",
    quantity: 1,
    unit: "head",
    images: ["https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800"],
  },
  {
    title: "Layer Chickens - 500 Birds",
    description: "Brown layer chickens, 6 months old, ready for egg production. Healthy flock with vaccination record.",
    price: 175000,
    category: "livestock",
    location: "Rawalpindi, Punjab",
    quantity: 500,
    unit: "birds",
    images: ["https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800"],
  },
  {
    title: "Sheep - Kajli Breed",
    description: "Kajli sheep herd, mixed ages. Good wool quality. Suitable for meat and breeding.",
    price: 45000,
    category: "livestock",
    location: "Attock, Punjab",
    quantity: 5,
    unit: "head",
    images: ["https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=800"],
  },
  
  // Equipment
  {
    title: "Massey Ferguson Tractor 385",
    description: "2020 model MF 385 tractor in excellent condition. 85 HP, 4WD. Only 1500 hours used. New tyres.",
    price: 2800000,
    category: "equipment",
    location: "Lahore, Punjab",
    quantity: 1,
    unit: "piece",
    images: ["https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800"],
  },
  {
    title: "Rotavator - Heavy Duty",
    description: "48 blade rotavator, barely used. Compatible with 50+ HP tractors. Perfect soil preparation.",
    price: 185000,
    category: "equipment",
    location: "Multan, Punjab",
    quantity: 1,
    unit: "piece",
    images: ["https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800"],
  },
  {
    title: "Wheat Thresher - New",
    description: "Brand new wheat thresher, high capacity 50 maunds per hour. Electric start, diesel engine.",
    price: 420000,
    category: "equipment",
    location: "Faisalabad, Punjab",
    quantity: 1,
    unit: "piece",
    images: ["https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800"],
  },
  {
    title: "Spray Machine - Tractor Mounted",
    description: "500 liter capacity spray machine with boom. Adjustable pressure. Almost new condition.",
    price: 95000,
    category: "equipment",
    location: "Gujranwala, Punjab",
    quantity: 1,
    unit: "piece",
    images: ["https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800"],
  },
  {
    title: "Solar Tube Well System",
    description: "Complete 10 HP solar tube well system. Includes panels, pump, controller. 6 month warranty.",
    price: 750000,
    category: "equipment",
    location: "Bahawalpur, Punjab",
    quantity: 1,
    unit: "set",
    images: ["https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800"],
  },
  
  // Fertilizers
  {
    title: "DAP Fertilizer - 50kg Bags",
    description: "Genuine DAP fertilizer from Engro. Sealed bags. Bulk quantity available at wholesale rate.",
    price: 13500,
    category: "fertilizers",
    location: "Karachi, Sindh",
    quantity: 100,
    unit: "bags",
    images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800"],
  },
  {
    title: "Urea Fertilizer - Fresh Stock",
    description: "Fauji Fertilizer Urea, 50kg bags. Direct from dealer. Minimum order 20 bags.",
    price: 3200,
    category: "fertilizers",
    location: "Islamabad",
    quantity: 200,
    unit: "bags",
    images: ["https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=800"],
  },
  {
    title: "Organic Compost - Farm Made",
    description: "100% organic compost made from farm waste. Rich in nutrients. Improves soil health.",
    price: 25,
    category: "fertilizers",
    location: "Kasur, Punjab",
    quantity: 5000,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=800"],
  },
  {
    title: "NPK Fertilizer - 15-15-15",
    description: "Balanced NPK fertilizer for all crops. 25kg bags. Excellent for vegetables and fruits.",
    price: 4800,
    category: "fertilizers",
    location: "Peshawar, KPK",
    quantity: 50,
    unit: "bags",
    images: ["https://images.unsplash.com/photo-1585314540237-13cb52ce7dee?w=800"],
  },
  
  // Seeds
  {
    title: "Wheat Seeds - Certified",
    description: "Government certified wheat seeds, Galaxy variety. High yield, disease resistant. 40kg bags.",
    price: 5500,
    category: "seeds",
    location: "Lahore, Punjab",
    quantity: 50,
    unit: "bags",
    images: ["https://images.unsplash.com/photo-1543257580-7269da773bf5?w=800"],
  },
  {
    title: "Rice Seeds - Super Kernel",
    description: "Premium Super Kernel Basmati rice seeds. High germination rate 95%+. Treated and packed.",
    price: 8000,
    category: "seeds",
    location: "Gujranwala, Punjab",
    quantity: 30,
    unit: "bags",
    images: ["https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800"],
  },
  {
    title: "Vegetable Seeds Kit",
    description: "Complete vegetable seeds kit - tomato, cucumber, pepper, eggplant, okra. Hybrid varieties.",
    price: 2500,
    category: "seeds",
    location: "Islamabad",
    quantity: 20,
    unit: "kits",
    images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800"],
  },
  {
    title: "Cotton Seeds - BT Variety",
    description: "Approved BT cotton seeds, high yield variety. Pest resistant. Government registered.",
    price: 4200,
    category: "seeds",
    location: "Multan, Punjab",
    quantity: 100,
    unit: "packets",
    images: ["https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800"],
  },
  {
    title: "Maize Seeds - Hybrid Yellow",
    description: "High yielding hybrid maize seeds. Suitable for silage and grain. Pioneer variety.",
    price: 6500,
    category: "seeds",
    location: "Sahiwal, Punjab",
    quantity: 40,
    unit: "bags",
    images: ["https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800"],
  },
  
  // Other
  {
    title: "Honey - Pure & Organic",
    description: "100% pure organic honey from Chitral. Raw and unprocessed. Collected from wild bees.",
    price: 2500,
    category: "other",
    location: "Chitral, KPK",
    quantity: 50,
    unit: "kg",
    images: ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800"],
  },
  {
    title: "Jute Bags - Eco Friendly",
    description: "Eco-friendly jute bags for grain storage. 50kg capacity. Durable and reusable.",
    price: 180,
    category: "other",
    location: "Karachi, Sindh",
    quantity: 500,
    unit: "pieces",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
  },
  {
    title: "Drip Irrigation Kit",
    description: "Complete drip irrigation kit for 1 acre. Includes pipes, drippers, filters. Easy installation.",
    price: 85000,
    category: "other",
    location: "Multan, Punjab",
    quantity: 5,
    unit: "kits",
    images: ["https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=800"],
  },
];

async function seedListings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the user
    const user = await User.findOne({ email: "ahtshamadil302@gmail.com" });
    if (!user) {
      console.error("❌ User not found with email: ahtshamadil302@gmail.com");
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Clear existing listings by this user (optional - comment out if you want to keep existing)
    // await Listing.deleteMany({ createdBy: user._id });
    // console.log("🗑️ Cleared existing listings");

    // Create listings
    const listingsWithUser = dummyListings.map(listing => ({
      ...listing,
      createdBy: user._id,
      status: "active",
    }));

    const created = await Listing.insertMany(listingsWithUser);
    console.log(`✅ Created ${created.length} dummy listings`);

    console.log("\n📊 Summary by category:");
    const categories = ["crops", "livestock", "equipment", "fertilizers", "seeds", "other"];
    for (const cat of categories) {
      const count = created.filter(l => l.category === cat).length;
      console.log(`   ${cat}: ${count} listings`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Done! Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedListings();
