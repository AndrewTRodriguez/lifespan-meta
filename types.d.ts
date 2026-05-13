// Declare CSS module side-effect imports for TypeScript 6.x compatibility.
declare module '*.css' {
  const styles: { readonly [key: string]: string };
  export default styles;
}
