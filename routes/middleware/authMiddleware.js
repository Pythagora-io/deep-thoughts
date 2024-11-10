const isAuthenticated = (req, res, next) => {
  console.log('isAuthenticated middleware:', {
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.userRole || 'undefined',
    sessionData: JSON.stringify(req.session)
  });

  if (req.session && req.session.userId) {
    return next(); // User is authenticated, proceed to the next middleware/route handler
  } else {
    return res.status(401).send('You are not authenticated'); // User is not authenticated
  }
};

const isAdmin = (req, res, next) => {
  console.log('isAdmin middleware:', {
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.userRole || 'undefined'
  });

  if (req.session && req.session.userRole === 'admin') {
    return next(); // User is an admin, proceed to the next middleware/route handler
  } else {
    return res.status(403).send('Access denied: Admin privileges required'); // User is not an admin
  }
};

module.exports = {
  isAuthenticated,
  isAdmin
};