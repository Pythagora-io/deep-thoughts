const User = require('../../models/User'); // Adjusted path based on project structure

const checkRole = (roles) => {
  return async (req, res, next) => {
    if (!req.session.userId) {
      console.error('Access denied: No user ID in session');
      return res.status(401).send('Unauthorized: No user ID in session');
    }

    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        console.error('Access denied: User not found');
        return res.status(401).send('Unauthorized: User not found');
      }

      console.log(`Checking role for user: ${user.username} with role: ${user.role}`);

      if (roles.includes(user.role)) {
        console.log(`Access granted for role: ${user.role}`);
        next();
      } else {
        console.error('Access denied: Insufficient privileges');
        res.status(403).send('Access denied: Insufficient privileges');
      }
    } catch (error) {
      console.error('Error in role middleware:', error);
      console.error(error.stack); // Log the full error stack
      res.status(500).send('Internal server error');
    }
  };
};

module.exports = {
  checkRole
};