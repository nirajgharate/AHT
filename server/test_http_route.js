async function test() {
  try {
    console.log("Sending POST request to http://localhost:5000/api/youtube/transcript...");
    const response = await fetch("http://localhost:5000/api/youtube/transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("HTTP SUCCESS!");
      console.log("Title:", data.title);
      console.log("Author:", data.author);
      console.log("Transcript preview:", data.text.slice(0, 150));
    } else {
      console.log("HTTP FAILED:", response.status, await response.text());
    }
  } catch (error) {
    console.error("HTTP Request Error:", error);
  }
}

test();
