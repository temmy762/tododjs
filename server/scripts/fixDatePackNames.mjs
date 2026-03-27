import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DatePackSchema = new mongoose.Schema({ name: String }, { strict: false });
const DatePack = mongoose.models.DatePack || mongoose.model('DatePack', DatePackSchema, 'datepacks');

await mongoose.connect(process.env.MONGO_URI);

const all = await DatePack.find({});
let fixed = 0;
for (const dp of all) {
  const cleaned = dp.name.replace(/-\d{8}T\d{6}Z-\d+-\d+$/, '').trim();
  if (cleaned !== dp.name) {
    await DatePack.findByIdAndUpdate(dp._id, { name: cleaned });
    console.log(`  "${dp.name}" → "${cleaned}"`);
    fixed++;
  }
}
console.log(`\nDone. Fixed ${fixed} date pack name(s).`);
await mongoose.disconnect();
process.exit(0);
