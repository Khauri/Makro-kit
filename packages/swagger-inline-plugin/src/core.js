import swaggerInline from 'swagger-inline';

export default async function getDoc({root, globs = [':root:/**/*.js'], base = ':root:/swaggerBase.json'}) {
  globs = globs.map(glob => glob.replace(':root:', root));
  base = base.replace(':root:', root);
  console.log(globs, base);
  const doc = await swaggerInline(globs, {base});
  return doc;
}