const UserMongoManager = require("../dao/Mongo/usersDao.mongo")

const { createHash, isValidPassword } = require('../utils/hashBcrypt')
const passport = require('passport')
const { loginModel } = require('../dao/models/session.model') // accedemos al user model a travez del manager
const { userModel } = require('../dao/models/users.model') // accedemos al user model a travez del manager

class SessionController {
    constructor(){
        this.userService = new UserMongoManager()
    }

    register = async (req, res)=>{
        const {first_name, last_name, email, password, age, role} = req.body
        try {
            let user = await userModel.findOne({email})

            if (user){
                res.status(200).json({
                    status: 'error',
                    message: 'El usuario ya existe'
                })
            }


            console.log("password: " + password)   

            let passwordHashed = createHash(password)
            
            let newUser = {
                first_name, 
                last_name,
                email,
                age,
                password: passwordHashed,
                role
            }   
            let result = await userModel.create(newUser)
            res.status(200).json({
                status: 'success',
                message: 'Usuario creado correctamente'
            })
        }catch (error) {
            res.status(500).send({
                status: 'error',
                message: error
            });
        }
        
    }

    addLogin = async (email, role) => {
        const now = new Date();
    
        // Busca una sesión existente con el mismo email
        let existingSession = await loginModel.findOne({ email });
    
        if (existingSession) {
            // Si existe, actualiza la última conexión
            existingSession.last_connection = now;
            await existingSession.save();
            console.log(`Sesión actualizada para ${email} a las ${now}`);
        } else {
            // Si no existe, crea una nueva sesión
            let newSession = {
                email,
                last_connection: now,
                role
            };
            await loginModel.create(newSession);
            console.log(`Nueva sesión creada para ${email} a las ${now}`);
        }
    }
    
    login  = async (req, res)=>{
        const { email, password } = req.body;
        try {
            let user = await userModel.findOne({email})
            if (!user) {
                return res.status(400).json({ message: 'Credenciales incorrectas' });
            }
    
            const isMatch = isValidPassword(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Credenciales incorrectas' });
            }

            console.log('Credenciales correctas');

            let urlRedirect = ""
            if(user.role === "admin" || user.role === "premium") {
                urlRedirect = '/realtimeproducts?email=' + encodeURIComponent(user.email) + '&role=' + encodeURIComponent(user.role)
            }else{
                urlRedirect = '/products?name=' + encodeURIComponent(user.name) + '&admin=false'
            }
            console.log(urlRedirect)

            this.addLogin(user.email,user.role)
            
            res.status(200).send({
                status: 'success',
                payload: req.session.user,
                message: 'Login correcto',
                redirectTo: urlRedirect
            })
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err });
        }
    }


    current = async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ status: 'error', error: 'No session found' });
        }
    
        res.status(200).json({
            status: 'success',
            payload: req.session.user,
            message: 'Current session data retrieved successfully'
        });
    }


    logout = (req, res) => {
        // session.destroy()
        req.session.destroy(err => {
            if(err) return res.send({status:'Logout error', message: err})           
        })
        res.status(200).redirect('/login')
    }

    failregister = (req, res) => {
        res.send({error: 'falla en el register'})
    }

    deleteUsers = (req, res) => {
        deleteInactiveEmails();
    }

    
}

module.exports = SessionController