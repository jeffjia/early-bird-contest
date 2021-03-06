/// \brief route User related methods.
/// \author Jeff Jia

var contestData = require('../models/contest');
var userModel = require('../models/user');
var userHelper = require('../helpers/user-helper');

/// local functions for exports.list
var createTab = function (name, filterFlag, active) {
  return {
    name: name
    , filterFlag: filterFlag
    , active: active
  };
}

// GET '/contests'
exports.list = function (req, res) {
  var filterFlag = req.query['tab'];
  var currentUser = userHelper.getCurrentUser(req);
  var tabs = new Array();
  tabs[0] = createTab('Subscribed', 'subscribed', false);
  tabs[1] = createTab('Featured', 'featured', false);
  tabs[2] = createTab('All', 'all', false);
  var foundActive = false;
  for (var i = 0; i < tabs.length; ++i) {
    if (tabs[i].filterFlag == filterFlag) {
      tabs[i].active = true;
      foundActive = true;
    }
  }
  if (!foundActive) {
    tabs[0].active = true;
  }
  raceModel.list('all', function (err, races) {
    if (err) {
      req.render('error', {
        title: '[Internal Error]',
        error: err
      });
    }
    else {
      res.render('contests', {
        title: 'Early Bird Contests - Contest List'
        , races: races
        , email: currentUser.email
        , tabs: tabs
      });
    }
  });
};

// GET '/contest/new'
exports.new = function (req, res) {
  var currentUser = userHelper.getCurrentUser(req);
  if (!currentUser.email) {
    // login first
    res.redirect('/login');
  }
  res.render('new-contest', {
    title: 'Early Bird Contests - Submit a New Contest'
    , email: currentUser.email
  });
};

// POST '/contest/new-submit'
exports.newSubmit = function (req, res) {
  var currentUser = userHelper.getCurrentUser(req);
  if (currentUser.email && userHelper.canCreateContest(currentUser.email)) {
    console.log(req.body);
    contestData.newContest(req.body['title'], {
      'from-date': req.body['from-date']
      , 'to-date': req.body['to-date']
      , repeat: req.body['repeat']
      , featured: req.body['featured']
      , description: req.body['description']
    }, function (err, contest) {
      if (err) {
        console.log(err);
        res.redirect('/contest/new?err=' + err.message);
        return;
      }
      res.redirect('/management');
    });
  }
  else {
    // the user cannot create a contest
    res.redirect('/login');
  }
};

// POST race submitting.
exports.submit = function(req, res) {
  var raceObj = {};
  raceObj.title = req.body.title;
  raceObj.description = req.body.description;
  if (req.body._id) {
    raceObj._id = req.body._id;
  }
  raceObj.status = 'active';
  raceModel.save(raceObj, function (err, _id) {
    if (err) {
      res.render('error', {
        title: 'Internal Error',
        error: err
      });
    }
    else {
      res.redirect('/raceview?_id=' + _id);
    }
  });
};

// GET '/contest/view?title=***'
exports.view = function(req, res) {
  var title = req.query['title'];
  var currentUser = userHelper.getCurrentUser(req);
  contestData.findByTitle(title, function (err, contest) {
    if (err) {
      res.redirect('/explore?err=' + err);
      return;
    }
    res.render('contest-view', {
      title: contest.title
      , email: currentUser.email
      , contest: contest
    });
    return;
  });
};

// GET '/contest/edit?title=***'
exports.edit = function(req, res) {
  var currentUser = userHelper.getCurrentUser(req);
  var title = req.query['title'];
  contestData.findByTitle(title, function (err, contest) {
    if (err) {
      res.redirect('/management?err=' + err);
      return;
    }
    res.render('contest-edit', {
      title: 'Edit - ' + title
      , email: currentUser.email
      , contest: contest
    });
  });
};

// GET '/contest/delete?title=***'
exports.delete = function (req, res) {
  var currentUser = userHelper.getCurrentUser(req);
  var title = req.query['title'];
  contestData.removeByTitle(title, function (err) {
    if (err) {
      res.redirect('/management?err=' + err);
      return;
    }
    res.redirect('/management');
  });
};

/// GET '/race-subscribe'
exports.subscribe = function (req, res) {
  var raceId = req.query['raceId'];
  var currentUser = userHelper.getCurrentUser(req);
  var currentUserId = currentUser.id;
  if (currentUserId) {
    raceModel.addParticipant(raceId, currentUserId
        , function (err) {
      if (err) {
        console.log(err);
        res.end(err);
        return;
      }
      console.log('[Info] Add participant successfully.');
      userModel.addRace(currentUserId, raceId, function (err) {
        if (err) {
          console.log(err);
          res.end('Error: ' + err);
          return;
        }
        console.log('[Info] Add race successfully.');
        res.redirect('/races');
      });
    });
  }
  else {
    // The user needs to sign in.
    res.redirect('/login');
  }
};
