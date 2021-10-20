const express = require('express');
const session = require('express-session');
const MongoDBSession = require('connect-mongodb-session')(session);
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');
const UserModel = require('./models/User');
const router = express.Router();
const userRoutes = require('./routes/user');
const app = express();
const cors = require("cors")
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cookieParser = require("cookie-parser");
const checkAuth = require('./middleware/checkAuth');
const resetAuth = require('./middleware/resetAuth');

const User = require('./middleware/key').user;
const Password = require('./middleware/key').pass;
const db = require('./middleware/key').mongoURI;

mongoose.connect(db, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const store = new MongoDBSession({
    uri: db,
    collection: "mySesions"
})

app.use(session({
    secret: 'ssshhhhh',
    store: store,
    saveUninitialized: false,
    resave: false,
    cookie: {
        expires: 60 * 60 * 24,
    },
}));

// Express body parser
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: 'include',
    })
)

app.use("/user", userRoutes);

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: User,
        pass: Password
    },
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).json({});
    }
    next();
});

app.get("/list", checkAuth, (req, res, next) => {
    UserModel.find()
        .then(result => {
            res.status(200).json({
                userData: result
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    return res.status(200).json({
        msg: "logout succesfully"
    });

})

app.post("/login", async (req, res) => {

    const {email, password} = req.body;
    const user = await UserModel.findOne({email});

    if (!user) {
        return res.status(500).json({
            success: false,
            email: "Email invaild"
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {

        return res.status(501).json({
            success: false,
            password: "Password invaild"
        });
    }

    const token = jwt.sign({
            _id: user._id,
            userType: user.userType,
            email: user.email,
            name: user.name
        },
        'this is dummy text',
        {
            expiresIn: "24h"
        }
    );
    return res.status(200).json({
        success: true,

        user: {
            id: user._id,
            userType: user.userType,
            token
        }
    });
})

app.post("/signup", (req, res, next) => {
    UserModel.find({email: req.body.email})
        .exec()
        .then(user => {
            if (user.length >= 1) {
                return res.status(409).json({
                    message: "Mail exists"
                });
            } else {
                bcrypt.hash(req.body.password, 10, (err, hash) => {
                    if (err) {
                        res.status(500).json({
                            error: err
                        });
                    } else {
                        const user = new UserModel({
                            _id: new mongoose.Types.ObjectId(),
                            name: req.body.name,
                            email: req.body.email,
                            userType: req.body.userType,
                            gender: req.body.gender,
                            age: req.body.age,
                            phone: req.body.phone,
                            password: hash
                        });
                        user
                            .save()
                            .then(result => {
                                console.log(result);
                                res.status(200).json({
                                    success: true,
                                    message: "User created"
                                });
                            })
                            .catch(err => {
                                console.log(err);
                                return res.status(500).json({
                                    error: err
                                });
                            });
                    }
                });
            }
        });
});

app.post("/forgotpassword", async (req, res, next) => {

    const {email} = req.body;
    const user = await UserModel.findOne({email});

    if (!user) {
        return res.status(500).json({
            message: "User invaild"
        });
    }
    const secret = 'this is dummy text'
    const payload = {
        email: user.email,
        id: user._id
    }
    const token = jwt.sign(payload, secret, {expiresIn: '15m'})

    let info = await transporter.sendMail({
        from: User,
        to: "amay@discoverwebtech.com",
        subject: 'Password Reset',
        html: `<h1>Welcome</h1><p>\
            <h3>Hello ${user.name}</h3>\
            If You are requested to reset your password then click on below link<br/>\
            <a href="http://localhost:3000/changepassword/${token}">Click On This Link</a>\
            </p>`

    })
    user.updateOne({resetLink: token})
    return res.status(200).json({success: true, message: "password reset link sent to your email account"})
})


app.put('/change-password/:id', resetAuth, async (req, res, next) => {
    const {password, password2} = req.body;
    if (!password || !password2 || (password2 !== password)) {
        res.send("Passwords Don't Match !");
    } else {

        var salt = await bcryptjs.genSalt(12);
        if (salt) {
            var hash = await bcryptjs.hash(password, salt);
            await UserModel.findOneAndUpdate({_id: req.params.id}, {$set: {password: hash}});
            res.status(200).json({success: true, message: "password update sucesss"})

        } else {
            res.render("Unexpected Error Try Again");

        }
    }
});

app.put('/reset-password/:id', async (req, res, next) => {
    const {password1, password2} = req.body;
    if (!password1 || !password2 || (password2 != password1)) {
        res.send("Passwords Don't Match !");
    } else {

        var salt = await bcryptjs.genSalt(12);
        if (salt) {
            var hash = await bcryptjs.hash(password1, salt);
            await UserModel.findOneAndUpdate({_id: req.params.id}, {$set: {password: hash}});
            res.status(200).json({success: true, message: "password update sucesss"})
        } else {
            res.render("Unexpected Error Try Again");
        }
    }
})


app.put("/:id", (req, res, next) => {
    UserModel.findOneAndUpdate({_id: req.params.id}, {
        $set: {
            name: req.body.name,
            email: req.body.email,
            userType: req.body.userType,
            gender: req.body.gender,
            age: req.body.age,
            phone: req.body.phone

        }
    })
        .then(result => {
            res.status(200).json({
                message: "User Updated"
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });

        });
});

app.get("/:id", (req, res, next) => {
    UserModel.findById(req.params.id)
        .then(result => {
            if (!result) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
            res.status(200).json({
                result: result,
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
});

app.delete("/:userId", (req, res, next) => {
    UserModel.remove({_id: req.params.userId})
        .exec()
        .then(result => {
            res.status(200).json({
                message: "User deleted"
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
});


app.use((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

app.use('/', router);

app.listen(process.env.PORT || 8000, () => {
    console.log(`App Started on PORT ${process.env.PORT || 8000}`)
})

