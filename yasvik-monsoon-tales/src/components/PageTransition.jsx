/** Plain wrapper — no Framer transform/opacity (those break position:sticky on Shop filters). */
export const PageTransition = ({ children }) => (
  <div style={{ width: '100%' }}>{children}</div>
);

export default PageTransition;
