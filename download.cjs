const fs = require("fs");
const https = require("https");
const path = require("path");

const dir = path.join(__dirname, "public", "textures");
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const files = [
  { name: "sun.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_sun.jpg" },
  { name: "mercury.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_mercury.jpg" },
  { name: "venus.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg" },
  { name: "earth_day.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg" },
  { name: "earth_night.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg" },
  { name: "earth_clouds.png", url: "https://www.solarsystemscope.com/textures/download/2k_earth_clouds.png" },
  { name: "moon.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_moon.jpg" },
  { name: "mars.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_mars.jpg" },
  { name: "jupiter.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg" },
  { name: "saturn.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg" },
  { name: "saturn_ring.png", url: "https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png" },
  { name: "uranus.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg" },
  { name: "neptune.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_neptune.jpg" },
  { name: "stars.jpg", url: "https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg" } // added stars just in case
];

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error('Failed to get ' + url + ' (' + response.statusCode + ')'));
      }
      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        console.log("Downloaded:", path.basename(dest));
        resolve();
      });
    }).on('error', err => {
      reject(err);
    });
  });
};

(async () => {
  for (const file of files) {
    const dest = path.join(dir, file.name);
    try {
      await downloadFile(file.url, dest);
    } catch (e) {
      console.error(e);
    }
  }
  console.log("All downloads completed.");
})();
