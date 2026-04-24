const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const srcFiles = walk('./src');

srcFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('alert(')) {
    // Add import if not present
    if (!content.includes("import toast from 'react-hot-toast';") && !content.includes("import { toast } from 'react-hot-toast';")) {
      // Find the last import
      const importRegex = /import [^;]+;/g;
      let lastImportIndex = -1;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      
      if (lastImportIndex !== -1) {
        content = content.substring(0, lastImportIndex) + "\nimport toast from 'react-hot-toast';" + content.substring(lastImportIndex);
      } else {
        content = "import toast from 'react-hot-toast';\n" + content;
      }
    }

    // Replace alert with toast
    // Specifically looking for success alerts to use toast.success
    content = content.replace(/alert\((['"`].*?(?:success|saved|successfully).*?['"`])\)/gi, 'toast.success($1)');
    // Replace the rest with toast.error
    content = content.replace(/alert\(/g, 'toast.error(');

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
