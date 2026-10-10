const ort = require('./node_modules/onnxruntime-web/dist/ort.node.min.js');

async function main() {
  const session = await ort.InferenceSession.create('./public/models/reader.onnx');
  
  // Create dummy input tensor [1, 64, 128, 3] of uint8
  const input = new Uint8Array(1 * 64 * 128 * 3);
  const tensor = new ort.Tensor('uint8', input, [1, 64, 128, 3]);
  
  const feeds = { [session.inputNames[0]]: tensor };
  const results = await session.run(feeds);
  
  const outputName = session.outputNames[0];
  const output = results[outputName];
  
  console.log("Output Shape:", output.dims);
  console.log("Output Type:", output.type);
  
  // Dump some output values to see what it looks like
  const data = output.data;
  console.log("Output data sample:", Array.from(data).slice(0, 20));
  
  // Are there other outputs?
  if (session.outputNames.length > 1) {
    for (let i = 1; i < session.outputNames.length; i++) {
       console.log("Output", i, session.outputNames[i], results[session.outputNames[i]].dims);
    }
  }
}

main().catch(console.error);
