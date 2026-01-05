process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { Firestore } = require("@google-cloud/firestore");
const FirestoreStore = require("firestore-store")(session);
require("dotenv").config();
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const { Storage } = require('@google-cloud/storage');
const xlsx = require('xlsx');
const app = express();
const PORT = process.env.port || 8080;
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const errorhandler = require('errorhandler');
const path = require('path');
const config = require('./config/config')[process.env.ADMINENV];

app.use(express.json());
app.set('trust proxy', 1);
app.set('port', config.app.port);
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(cookieParser());

// Initialize Firestore for session store
const projectId = process.env.PROJECT_ID;
const keyFilename = process.env.KEYFILENAME;
const database = process.env.DATABASE;
const dataFilePath = path.join(__dirname, keyFilename);

const sessionFirestore = new Firestore({
  projectId: projectId,
  keyFilename: dataFilePath,
  databaseId: database
});

// Session configuration - different settings for local vs production
const isLocalDev = process.env.USE_LOCAL_AUTH === 'true';
app.use(session({
  name: 'connect.sid',
  secret: '132768546309',
  resave: false,
  saveUninitialized: false,
  store: new FirestoreStore({
    database: sessionFirestore,
    kind: 'express-sessions'
  }),
  cookie: {
    httpOnly: true,
    secure: isLocalDev ? false : true,        // false for local HTTP, true for production HTTPS
    sameSite: isLocalDev ? 'lax' : 'none',    // 'lax' for local, 'none' for production
    maxAge: 30 * 24 * 60 * 60 * 1000          // 30 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors({
  origin: process.env.ORIGIN,
  credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(errorhandler());

require('./config/passport')(passport, config);
require('./config/routes')(app, config, passport);

const bucketName = process.env.BUCKETNAME; // Excel bucket

if (!projectId || !keyFilename || !bucketName) {
  console.warn(
    '⚠️ PROJECT_ID, KEYFILENAME, BUCKET_NAME must be set in .env'
  );
}

const storage = new Storage({
  projectId,
  keyFilename,
});

/*Configuration to connect Firestore Database*/
const firestore = sessionFirestore; // Reuse the same Firestore instance

const upload = multer({ dest: os.tmpdir() });

const validateExcel = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();

  const allowedExts = ['.xlsx', '.xls'];
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  const isExcel =
    allowedExts.includes(fileExt) ||
    allowedMimeTypes.includes(req.file.mimetype);

  if (!isExcel) {
    fs.unlinkSync(filePath);
    return res.status(400).json({
      error: 'Invalid file type. Only Excel files (.xlsx/.xls) are allowed.',
    });
  }
  next();
};

function getFormattedTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}${month}${year}_${hours}${minutes}${seconds}`;
}

// Load user authentication module
const user_auth = require("./authentication/user_auth.js");

// Initialize all routes from routes.js
const initializeRoutes = require('./routes');
initializeRoutes(app, {
  firestore,
  storage,
  bucketName,
  upload,
  validateExcel,
  getFormattedTimestamp,
  user_auth
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});