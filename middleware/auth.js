const jwt = require("jsonwebtoken");
const config = require("config");



const auth = (req, res, next) => {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access token not found" });
    }

//Veryfying token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ message: "Invalid access token" });
      }
      req.user = user;

      //pass to next middleware
      next();
    });

}

module.exports = auth;