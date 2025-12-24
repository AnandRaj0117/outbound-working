exports.user_authentication_func = async (req, res, firestore) => {

    try {
        var authentication_flag = false;
        let responseJson = {};

        const emailId = req.body.emailId;
        const password = req.body.password;
        const useLocalAuth = process.env.USE_LOCAL_AUTH === 'true';

        let userName = null;
        let userEmail = null;

        // Validate that credentials are provided
        if (!emailId || !password) {
            responseJson = {
                'emergency': {
                    'authenticated': false,
                    'userName': null
                }
            };
            return res.json(responseJson);
        }

        // LOCAL MODE: Accept ANY credentials without Firestore validation
        if (useLocalAuth) {
            console.log("🔓 LOCAL AUTH MODE: Accepting any credentials");

            userName = "Local Dev User";
            userEmail = emailId; // Use whatever email they entered
            authentication_flag = true;

            // Create session for local auth
            const user = {
                mail: userEmail,
                upn: userEmail,
                firstName: "Local",
                lastName: "User",
                authMode: 'local'
            };

            // Login the user using passport
            req.login(user, (err) => {
                if (err) {
                    console.error('Error creating session:', err);
                    return res.status(500).json({ error: 'Session creation failed' });
                }

                console.log("✅ Local authentication successful for:", userEmail);

                responseJson = {
                    'emergency': {
                        'authenticated': authentication_flag,
                        'userName': userName,
                        'userEmail': userEmail
                    }
                };

                return res.json(responseJson);
            });

            return; // Exit to avoid sending response twice
        }

        // PRODUCTION MODE: Validate against Firestore
        const results = await firestore.collection('emergency').doc('user_auth').collection('hub_users')
            .where('emailId', '==', emailId)
            .where('password', '==', password)
            .get();

        if (!results.empty) {
            const doc = results.docs[0].data();
            userName = doc.firstName + " " + doc.lastName;
            userEmail = doc.emailId;
            authentication_flag = true;

            // Create session for local auth (similar to SAML)
            const user = {
                mail: userEmail,
                upn: userEmail,
                firstName: doc.firstName,
                lastName: doc.lastName,
                authMode: 'local-db'
            };

            // Login the user using passport
            req.login(user, (err) => {
                if (err) {
                    console.error('Error creating session:', err);
                    return res.status(500).json({ error: 'Session creation failed' });
                }

                console.log("✅ Database authentication successful for:", userEmail);

                responseJson = {
                    'emergency': {
                        'authenticated': authentication_flag,
                        'userName': userName,
                        'userEmail': userEmail
                    }
                };

                return res.json(responseJson);
            });

            return; // Exit to avoid sending response twice
        }

        // Authentication failed
        responseJson = {
            'emergency': {
                'authenticated': false,
                'userName': null
            }
        };

        return res.json(responseJson);
    }
    catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

}
