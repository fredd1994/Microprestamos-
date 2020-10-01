  var express = require("express"),
    app = express(),
    bodyParser  = require("body-parser"),
    methodOverride = require("method-override"),
    http = require(`http`),
    Validator = require('validatorjs'),
    nodemailer = require('nodemailer');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

const router = express.Router();
const jsonParser = bodyParser.json();
const port = process.env.PORT || 8080;
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerObtions ={
  swaggerDefinition:{
    info:{
      title: "Microprestamos api",
      description:  "API para calcular la cuota de un microprestamo que un cliente quiere solicitar y debe pagar mensualmente/quincenalmente .",
      contact: {
        name: "Fredd",
        url : "No",
        email: "fredd.a14@hotmail.com"
      },
      servers: ["https://microprestamos.herokuapp.com/"]
      
    }
  },
  apis: ["index.js"]
}

const swaggerDocs = swaggerJsDoc(swaggerObtions);
app.use("/api-docs",swaggerUi.serve, swaggerUi.setup(swaggerDocs));

Validator.useLang('es');

router.get('/', function(req, res) {
  res.send("Calcular cuouta");
});

router.post('/',jsonParser, function(req, res) {
  const validationRules = {
    "name":"required|string", 
    "email": "required|email",
    "totalIngress":"required|numeric",
    "sector": "required|string|in:publico,privado",
    "workYears": "required|integer",
    "amount": "required|integer|min:100|max:2000",
    "frecuency": "string|in:mensual,quincenal",
    "payTime": "integer"
  }

  var name = req.body.name;
  var email= req.body.email;
  var totalIngress= req.body.totalIngress;
  var sector= req.body.sector;
  var workYears= req.body.workYears;
  var amount= req.body.amount;
  var frecuency=req.body.frecuency || "mensual";
  var payTime= req.body.payTime || 3;

  let validation = new Validator(req.body, validationRules);
 
  if (validation.passes()) {
    
    var loan_quota = calculate_loan_quota(amount,18,payTime,frecuency).toFixed(2);

    var output = {
      "amount"    :`$${amount}.`,
      "text"      : `La cuota sería $${loan_quota} ${frecuency} durante ${payTime} meses.`,
      "frecuency" : frecuency,
      "paytime"   : `${payTime} meses.`
   } 

   contentHTML = `
   <h1>User Information</h1>
   <ul>
       <li>Name: ${name}</li>
       <li>Email: ${email}</li>
       <li>Total Ingress: ${totalIngress}</li>
       <li>Sector: ${sector}</li>
       <li>Work Years: ${workYears}</li>
       <li>Amount: ${amount}</li>
       <li>Frecuency: ${frecuency}</li>
       <li>Pay Time: ${payTime}</li>
       <li>Loan Cuota: ${loan_quota}</li>
   </ul>  
  `;
 
   let transporter = nodemailer.createTransport({
     service: 'Gmail', // no need to set host or port etc.
     auth: {
       user: 'micropagos2020@gmail.com',
       pass: 'Micropagoscr'
     }
   });
   
   var mailOptions = {
     from: 'micropagos2020@gmail.com',
     to: 'fredd.a14@hotmail.com',
     subject: 'Solicutud de nuevo crédito',
     html : contentHTML
   };
   
   transporter.sendMail(mailOptions, function(error, info){
     if (error) {
       console.log(error);
     } else {
       console.log(`Email sent:${info.response}` );
     }
   });
  } else {

    var output = validation.errors;
  } 


  


  res.send(output);
});




app.use(router);

app.listen(port, function() {
  console.log("Node server running on http://localhost:3000");
});


function calculate_loan_quota(amount, rate, totalTerm, frecuency) {
  var interest = parseFloat(rate) / 100 / 12;
  var period_int = Math.pow(1 + interest, totalTerm);
  var monthly_payment = (amount * period_int * interest) / (period_int - 1);
  return frecuency == 'mensual' ? monthly_payment : monthly_payment / 2;
}