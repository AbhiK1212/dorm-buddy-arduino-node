const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const port = new SerialPort({ path: process.env.SERIAL_PORT_PATH || 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
app.use(bodyParser.json({ limit: '1mb', extend: true }));

const dormSchema = new mongoose.Schema({
  dormName: { type: String, required: true, unique: true},
  dormId: { type: String, required: true, unique: true},
  dormTemperature: { type: Number, required: true },
  dormHumidity: { type: Number, required: true },
  dormMembers: { type: Array, required: true },
  doorLastOpened: { type: Date, required: true },
  doorOpenedTimes: { type: Array, required: true },
  dormStatus: { type: String, required: true },
  dormDescription: { type: String, required: true },
});
const Dorm = mongoose.model('Dorm', dormSchema);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  const mongoPort = process.env.PORT || 3001;
  app.listen(mongoPort, () => console.log('Server listening on port ' + mongoPort));
}).catch(err => console.error('MongoDB connection error:', err));

const parseData = (data) => {
  const actionType = data.charAt(0);
  const value = parseInt(data.substring(3), 10);

  return { actionType, value };
};

const handleData = async ({ actionType, value }, dormId) => {
  switch (actionType) {
    case 'S':
      return updateDormStatus(dormId, value);
    case 'H':
      return updateDormHumidity(dormId, value);
    case 'T':
      return updateDormTemperature(dormId, value);
    case 'D':
      return handleDoorData(dormId, value);
    default:
      console.log('Unknown data type received:', actionType);
  }
};

const updateDormStatus = async (dormId, status) => {
  const foundDorm = await Dorm.findOneAndUpdate({dormId}, {dormStatus: status})
};

const updateDormHumidity = async (dormId, humidity) => {
  const foundDorm = await Dorm.findOneAndUpdate({dormId}, {dormHumidity: humidity})
};

const updateDormTemperature = async (dormId, temperature) => {
  const foundDorm = await Dorm.findOneAndUpdate({dormId}, {dormTemperature: temperature})
};

const handleDoorData = async (dormId, doorValue) => {
  if (doorValue < 30) {
    const lastOpened = new Date()
    const foundDorm = await Dorm.findOne({dormId})
    await Dorm.findOneAndUpdate({dormId}, {doorLastOpened: lastOpened, doorOpenedTimes: [...foundDorm.doorOpenedTimes, lastOpened ]})
  }
};

parser.on('data', (newData) => {
  const parsedData = parseData(newData);
  handleData(parsedData, "ABC123")
    .catch(err => console.error('Error handling data:', err));
});

