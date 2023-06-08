

const { GoogleAuth } = require('google-auth-library');
const aiplatform = require('@google-cloud/aiplatform');
const {instance, params, prediction} =
  aiplatform.protos.google.cloud.aiplatform.v1.schema.predict;
const {PredictionServiceClient} = aiplatform.v1;
const {helpers} = aiplatform;
const jimp = require('jimp');

// image handling
const { promisify } = require('util');
const { createImage } = require('pngjs-image');
// const bufferToBase64 = (buffer) => {
//   return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
//   ;
// };

async function base64ToImage(imageStr) {
  try {
    const base64Data = imageStr.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const image = await jimp.read(buffer);

    const base64Image = await image.getBase64Async(jimp.MIME_PNG);
    return base64Image;
  } catch (error) {
    throw new Error('Failed to convert base64 to image: ' + error.message);
  }
}

function isBase64Encoded(str) {
  try {
    return btoa(atob(str)) === str;
  } catch (error) {
    return false;
  }
}


//Specifies the location of the api endpoint
const clientOptions = {
  apiEndpoint: process.env.API_ENDPOINT,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  },
};

// Instantiates a client
const predictionServiceClient = new PredictionServiceClient(clientOptions);

// async function getAccessToken() {
//   const auth = new GoogleAuth({
//     credentials: {
//       client_email: process.env.GOOGLE_CLIENT_EMAIL,
//       private_key: process.env.GOOGLE_PRIVATE_KEY,
//     },
//     scopes: ['https://www.googleapis.com/auth/cloud-platform'],
//   });
//   const client = await auth.getClient();
//   const accessToken = await client.getAccessToken();
//   return accessToken;
// }

const generateAction = async (req, res) => {
  console.log('Received request');
  // Get the values from environment variables
  const project = process.env.PROJECT_ID;
  const location = process.env.LOCATION;
  const endpointId = process.env.ENDPOINT_ID;
  // // Get the access token
  // const accessToken = await getAccessToken();
  // console.log(accessToken.token);
  // Ensure the required environment variables are set

  const endpoint = `projects/${project}/locations/${location}/endpoints/${endpointId}`;

  if (!project || !location || !endpointId) 
    {
      console.error('Missing required environment variables');
      res.status(500).json({ error: 'Missing required environment variables' });
      return;
    }
  // Get the input data
  const input = JSON.parse(req.body).finalInput;
  const input_str = `"${input}"`
  console.log(input_str);
  // Construct the request payload
  const instances = [helpers.toValue({ "prompt": input_str})];
  // const payload = {
  //   instances: {"prompt": input_str},
  // };

  // const headers = {
  //   'Content-Type': 'application/json',
  //   Authorization: `Bearer ${accessToken.token}`,
  // };


  const request = {
      endpoint,
      instances
      };

  const[response] = await predictionServiceClient.predict(request);

  console.log(response.predictions[0]);
  const img = response.predictions[0].stringValue;

  const isValidBase64 = isBase64Encoded(img);
  if (isValidBase64) {
    console.log('The string is a valid base64-encoded string.');
  } else {
    console.log('The string is not a valid base64-encoded string.');
  }

  // Make sure to change to base64
  // const base64Image = bufferToBase64(img);
  // res.status(200).json({ image: base64Image });

  const base64Image = img;

  base64ToImage(base64Image)
    .then((final_image) => {
      // Use the image object
      console.log(final_image);
      res.status(200).json({ image: final_image })
    })
    .catch((error) => {
      console.error('Failed to convert base64 to image:', error);
    });

// // Extract the image data from the compressed response body
// const compressedBuffer = Buffer.from(response.data.predictions[0].image, 'base64');
// const decompressedBuffer = zlib.inflateSync(compressedBuffer);

// // Convert to base64
// const base64Image = bufferToBase64(decompressedBuffer);
// res.status(200).json({ image: base64Image });


};

export default generateAction;
