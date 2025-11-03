export async function testAPI() {
  const response = await fetch("/api/claims");
  const data = await response.json();
  console.log("API Response:", data);
}
