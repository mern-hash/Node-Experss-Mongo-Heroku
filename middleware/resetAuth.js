const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // const { resetLink} = req.body;
        const  resetLink = req.headers.authorization.split(" ")[1];
        console.log(resetLink);
        jwt.verify(resetLink, 'this is dummy text', function (error, decodedData) {
            if (error) { return res.status(500).json({ error: "Incorrect Token or Token Expire" }) }
            next();
        })
    }
    catch (error) {
        return res.status(401).json({
            message: 'Auth failed'
        });
    }
};