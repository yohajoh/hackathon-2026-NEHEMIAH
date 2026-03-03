import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

const unusedVariable = "I should be red";

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
