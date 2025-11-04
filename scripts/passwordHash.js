import bcrypt from "bcrypt";

const hash = "$2b$10$kxmsQz4AbConk/iOsX/idui9uwQpFMYOowXff0vYXs6iM3YzWEpWW";
const input = "joshuasvy";

bcrypt.compare(input, hash).then((match) => {
  console.log("✅ Manual match result:", match);
});
