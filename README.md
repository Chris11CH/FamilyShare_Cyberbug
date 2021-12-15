# Families Share installation guide

 1. Check if you have installed node.js and npm, if not do it
 2. Download the [server](https://github.com/Chris11CH/FamilyShare_Cyberbug) and navigate in the main folder, open a terminal and type
```
npm install
```
3. You may be needed to download an additional package to run the server, you can install it with
```
npm install supervisor
```
4. Create a MongoDB database, you can use the free cloud solution to do so.
5. Open the .env file and in ```DB_DEV_HOST``` paste you database URI
6. Start the server with
```
npm run dev-server
```
7. Download and build the Android app from [this](https://github.com/Tony3oo3/FamilyShare_Cyberbug_app) repository
8. Change the server IP address in ```MainActivity.java``` with yours
9. Run the app
