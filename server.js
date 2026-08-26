import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const allowed = (process.env.FRONTEND_URL || "https://netrent.netlify.app")
  .split(",").map(x => x.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.includes(origin) || origin.endsWith(".netlify.app")) return cb(null, true);
    return cb(new Error("CORS blocked"));
  },
  credentials: true
}));
app.use(express.json({limit:"1mb"}));

const userSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  phone:{type:String,required:true},
  passwordHash:{type:String,required:true},
  role:{type:String,enum:["renter","owner"],default:"renter"}
},{timestamps:true});

const propertySchema = new mongoose.Schema({
  ownerId:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null},
  title:{type:String,required:true,trim:true},
  type:{type:String,required:true,enum:["Flat","House","PG"]},
  location:{type:String,required:true,trim:true},
  rent:{type:Number,required:true,min:0},
  bedrooms:{type:Number,default:0},
  bathrooms:{type:Number,default:0},
  area:{type:Number,default:0},
  imageUrl:{type:String,default:""},
  description:{type:String,default:""},
  status:{type:String,default:"active"}
},{timestamps:true});

const bookingSchema = new mongoose.Schema({
  propertyId:{type:mongoose.Schema.Types.ObjectId,ref:"Property",required:true},
  renterId:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null},
  name:{type:String,required:true},
  phone:{type:String,required:true},
  moveIn:{type:Date,default:null},
  status:{type:String,default:"pending"}
},{timestamps:true});

const User=mongoose.model("User",userSchema);
const Property=mongoose.model("Property",propertySchema);
const Booking=mongoose.model("Booking",bookingSchema);

function auth(req,res,next){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Login required"});
  try{req.user=jwt.verify(h.slice(7),JWT_SECRET);next();}
  catch{return res.status(401).json({error:"Invalid or expired token"});}
}

app.get("/",(req,res)=>res.json({ok:true,name:"HavenRent API",database:"MongoDB",version:"2.0"}));

app.get("/api/health",(req,res)=>{
  res.json({
    ok:true,
    database:mongoose.connection.readyState===1?"connected":"disconnected"
  });
});

app.post("/api/auth/signup",async(req,res)=>{
  try{
    const {name,email,phone,password,role="renter"}=req.body;
    if(!name||!email||!phone||!password)
      return res.status(400).json({error:"Name, email, phone and password are required"});
    if(password.length<6)
      return res.status(400).json({error:"Password must be at least 6 characters"});
    const exists=await User.findOne({email:email.toLowerCase()});
    if(exists)return res.status(409).json({error:"Email already registered"});
    const passwordHash=await bcrypt.hash(password,12);
    const user=await User.create({name,email,phone,passwordHash,role:role==="owner"?"owner":"renter"});
    const token=jwt.sign({id:user._id.toString(),email:user.email,role:user.role},JWT_SECRET,{expiresIn:"7d"});
    res.status(201).json({token,user:{id:user._id,name:user.name,email:user.email,phone:user.phone,role:user.role}});
  }catch(e){console.error(e);res.status(500).json({error:"Signup failed"});}
});

app.post("/api/auth/login",async(req,res)=>{
  try{
    const {email,password}=req.body;
    if(!email||!password)return res.status(400).json({error:"Email and password are required"});
    const user=await User.findOne({email:email.toLowerCase()});
    if(!user||!(await bcrypt.compare(password,user.passwordHash)))
      return res.status(401).json({error:"Invalid email or password"});
    const token=jwt.sign({id:user._id.toString(),email:user.email,role:user.role},JWT_SECRET,{expiresIn:"7d"});
    res.json({token,user:{id:user._id,name:user.name,email:user.email,phone:user.phone,role:user.role}});
  }catch(e){res.status(500).json({error:"Login failed"});}
});

app.get("/api/me",auth,async(req,res)=>{
  const user=await User.findById(req.user.id).select("-passwordHash");
  if(!user)return res.status(404).json({error:"User not found"});
  res.json(user);
});

app.get("/api/properties",async(req,res)=>{
  try{
    const {q="",type="all",maxRent="all"}=req.query;
    const filter={status:"active"};
    if(type&&type!=="all")filter.type=type;
    if(maxRent&&maxRent!=="all")filter.rent={$lte:Number(maxRent)};
    if(q){
      filter.$or=[
        {title:{$regex:q,$options:"i"}},
        {location:{$regex:q,$options:"i"}},
        {description:{$regex:q,$options:"i"}}
      ];
    }
    const data=await Property.find(filter).sort({createdAt:-1});
    res.json(data);
  }catch(e){res.status(500).json({error:"Could not load properties"});}
});

app.get("/api/properties/:id",async(req,res)=>{
  try{
    const p=await Property.findById(req.params.id);
    if(!p)return res.status(404).json({error:"Property not found"});
    res.json(p);
  }catch{res.status(400).json({error:"Invalid property id"});}
});

app.post("/api/properties",auth,async(req,res)=>{
  try{
    const {title,type,location,rent,bedrooms=0,bathrooms=0,area=0,imageUrl="",description=""}=req.body;
    if(!title||!type||!location||rent===undefined)
      return res.status(400).json({error:"Title, type, location and rent are required"});
    const p=await Property.create({
      ownerId:req.user.id,title,type,location,rent:Number(rent),
      bedrooms:Number(bedrooms),bathrooms:Number(bathrooms),area:Number(area),
      imageUrl,description
    });
    res.status(201).json(p);
  }catch(e){res.status(500).json({error:"Could not create property"});}
});

app.get("/api/my-properties",auth,async(req,res)=>{
  const data=await Property.find({ownerId:req.user.id}).sort({createdAt:-1});
  res.json(data);
});

app.post("/api/bookings",async(req,res)=>{
  try{
    const {propertyId,name,phone,moveIn,renterId}=req.body;
    if(!propertyId||!name||!phone)
      return res.status(400).json({error:"Property, name and phone are required"});
    const p=await Property.findOne({_id:propertyId,status:"active"});
    if(!p)return res.status(404).json({error:"Property not available"});
    const b=await Booking.create({
      propertyId,renterId:renterId||null,name,phone,moveIn:moveIn||null
    });
    res.status(201).json({
      booking:b,
      property:{id:p._id,title:p.title,rent:p.rent},
      payment:{method:"UPI",upiId:process.env.PAYMENT_UPI||""}
    });
  }catch(e){console.error(e);res.status(500).json({error:"Booking failed"});}
});

app.get("/api/my-bookings",auth,async(req,res)=>{
  const data=await Booking.find({renterId:req.user.id}).populate("propertyId").sort({createdAt:-1});
  res.json(data);
});

mongoose.connect(process.env.MONGODB_URI)
  .then(()=>app.listen(PORT,()=>console.log(`HavenRent API running on ${PORT}`)))
  .catch(err=>{console.error("MongoDB connection failed:",err.message);process.exit(1);});
