/**
 * <Ltr> — isolates a left-to-right fragment (price, ID, date, number, English
 * text) inside Urdu/RTL content so the bidi algorithm doesn't reorder it.
 *
 * The native <bdi> element isolates by default; forcing dir="ltr" guarantees
 * the internal order for things like prices and codes (₨4,000–5,000, ORD-123).
 * Layout is untouched — this only affects text reading order.
 *
 *   <Ltr>₨{price.toLocaleString()}</Ltr>
 *   <Ltr className="font-mono">{transaction._id}</Ltr>
 */
const Ltr = ({ children, className = "" }) => (
  <bdi dir="ltr" className={`ltr-num ${className}`.trim()}>
    {children}
  </bdi>
);

export default Ltr;
