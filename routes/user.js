const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const UserModel = require('../models/User');


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


module.exports = router;
