const data = {
  email: "sowjanya060504@gmail.com",
  password: "Password@123"
};

fetch("http://localhost:3000/api/v1/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(data)
})
.then(res => {
  console.log("Status:", res.status);
  return res.text();
})
.then(text => console.log("Body:", text))
.catch(err => console.error("Error:", err));
