const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const UserModel = require('../models/User');
const checkAuth = require('../middleware/checkAuth');
const resetAuth = require('../middleware/resetAuth');
const jwt = require('jsonwebtoken');


router.post("/Register", (req, res, next) => {
  UserModel.find({ email: req.body.email })
      .exec()
      .then(user => {
          if (user.length >= 1) {
              return res.status(500).json({
                  success:false,
                  message: "Mail exists"
              });
          } else {
              bcrypt.hash(req.body.password, 10, (err, hash) => {
                  if (err) {
                      return res.status(500).json({

                          error: err
                      });
                  } else {
                    
                      const user = new UserModel({
                          _id: new mongoose.Types.ObjectId(),
                          name: req.body.name,
                          email: req.body.email,
                          userType:req.body.userType,
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
                                  success : true,
                                  message: "User created"
                              });
                          })
                          .catch(err => {
                              console.log(err);
                              res.status(500).json({
                                  error: err
                              });
                          });
                  }
              });
          }
      });
});


router.get("/list", checkAuth, (req, res, next) => {
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


router.post("/login", async (req, res) => {

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


router.post("/signup", (req, res, next) => {
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


router.post("/forgotpassword", async (req, res, next) => {

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


router.put('/change-password/:id', resetAuth, async (req, res, next) => {
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

router.put('/reset-password/:id', async (req, res, next) => {
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


router.put("/:id", (req, res, next) => {
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

router.get("/:id", (req, res, next) => {
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

router.delete("/:userId", (req, res, next) => {
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








module.exports = router;
