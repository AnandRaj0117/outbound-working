const fs = require('fs'); // Add this line to import the fs module
require("dotenv").config();

let certContent = '';
try {
  certContent = fs.readFileSync('./'+process.env.CERT, 'utf-8');
  
} catch (err) {
  console.error('❌ Error reading certificate file:', err.message);
}
module.exports = {
  development: {
    app: {
      name: 'Passport SAML strategy example',
      port: process.env.PORT || 3000
    },
    passport: {
      strategy: 'saml',
      saml: {
        path: process.env.SAML_PATH || '/login/callback/',
        callbackUrl: process.env.CALLBACKURL+'/login/callback',
        entryPoint: 'https://login.microsoftonline.com/513aee1a-7f0a-4fec-978c-0ece4e1c0a48/saml2',
        //entryPoint: process.env.SAML_ENTRY_POINT || 'https://login.microsoftonline.com/9e5c4d0e-0350-42f1-a09d-a92102007f5a/saml2', //get this from your Entra ID
        issuer: process.env.CALLBACKURL+'/login', //this will be the client ID for Azure Entra ID Enterprise Application
        cert: certContent,
        wantAssertionsSigned: false,
        wantAuthnResponseSigned: false,
      }
    }
  },
  test: {
    app: {
      name: 'Passport SAML strategy example',
      port: process.env.PORT || 3000
    },
    passport: {
      strategy: 'saml',
      saml: {
        path: process.env.SAML_PATH || '/login/callback/',
        callbackUrl: process.env.CALLBACKURL+'/login/callback',
        entryPoint: 'https://login.microsoftonline.com/513aee1a-7f0a-4fec-978c-0ece4e1c0a48/saml2',
        //entryPoint: process.env.SAML_ENTRY_POINT || 'https://login.microsoftonline.com/9e5c4d0e-0350-42f1-a09d-a92102007f5a/saml2', //get this from your Entra ID
        issuer: process.env.CALLBACKURL+'/login', //this will be the client ID for Azure Entra ID Enterprise Application
        cert: certContent,
        wantAssertionsSigned: false,
        wantAuthnResponseSigned: false,
      }
    }
  },
  ppd: {
    app: {
      name: 'Passport SAML strategy example',
      port: process.env.PORT || 3000
    },
    passport: {
      strategy: 'saml',
      saml: {
        path: process.env.SAML_PATH || '/login/callback/',
        callbackUrl: process.env.CALLBACKURL+'/login/callback',
        entryPoint: 'https://login.microsoftonline.com/513aee1a-7f0a-4fec-978c-0ece4e1c0a48/saml2',
        //entryPoint: process.env.SAML_ENTRY_POINT || 'https://login.microsoftonline.com/9e5c4d0e-0350-42f1-a09d-a92102007f5a/saml2', //get this from your Entra ID
        issuer: process.env.CALLBACKURL+'/login', //this will be the client ID for Azure Entra ID Enterprise Application
        cert: certContent,
        wantAssertionsSigned: false,
        wantAuthnResponseSigned: false,
      }
    }
  }
};
