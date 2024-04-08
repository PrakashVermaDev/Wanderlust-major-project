if(process.env.NODE_ENV != "production") {
    require('dotenv').config();
}


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/expressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


// MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
dbUrl = process.env.ATLASDB_URL;


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600
});

store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE", err);
})


const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}


const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const { error } = require('console');


main()
.then(() => {
    console.log("connected to DB");
})
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbUrl);
}

app.listen(8080, () => {
    console.log("app is listeing on port 8080");
})

// app.get("/", (req,res) => {
//     res.send("Hi, I am root");
// })

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.curUser = req.user;
    next();
})

// app.get("/demouser", async (req,res) => {
//     let fakeuser = new User({
//         email: "student@gmail.com",
//         username: "alpha-student"
//     })
     
//     let registereduser = await User.register(fakeuser, "helloworld");
//     res.send(registereduser);
// })


app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


app.all("*", (req,res,next) => {
    next(new ExpressError(404, "Page not found!"));
})

app.use((err,req,res,next) => {
    let {statusCode=500,message="something went wrong"} = err;
    res.status(statusCode).render("error.ejs", {message});
})

