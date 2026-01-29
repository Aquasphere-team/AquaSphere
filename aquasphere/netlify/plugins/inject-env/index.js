const fs = require('fs');
const path = require('path');

module.exports = {
  onPostBuild: ({ constants }) => {
    const distPath = path.join(constants.PUBLISH_DIR);
    const jsFiles = fs.readdirSync(distPath)
      .filter(file => file.startsWith('main-') && file.endsWith('.js'));

    jsFiles.forEach(file => {
      const filePath = path.join(distPath, file);
      let content = fs.readFileSync(filePath, 'utf8');

      // Replace the variable declarations
      content = content.replace(
        /NG_APP_SUPABASE_URL/g,
        `"${process.env.NG_APP_SUPABASE_URL}"`
      );
      content = content.replace(
        /NG_APP_SUPABASE_KEY/g,
        `"${process.env.NG_APP_SUPABASE_KEY}"`
      );

      fs.writeFileSync(filePath, content);
      console.log(`✓ Injected env vars into ${file}`);
    });
  }
};
