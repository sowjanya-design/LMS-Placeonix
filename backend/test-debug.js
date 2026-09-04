const data = {
  email: "sowjanya060504@gmail.com",
  password: "Password123"
};

fetch("https://backend-pearl-seven-77.vercel.app/api/v1/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Origin": "https://placeonix-frontend-v2.vercel.app"
  },
  body: JSON.stringify(data)
})
.then(res => res.text())
.then(text => console.log(text))
.catch(err => console.error(err));
