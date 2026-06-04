const normalizeDigits = (value = '') => {
  const input = String(value);
  let output = '';

  for (const char of input) {
    const code = char.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) {
      output += String(code - 0x0660);
    } else if (code >= 0x06F0 && code <= 0x06F9) {
      output += String(code - 0x06F0);
    } else {
      output += char;
    }
  }

  return output;
};

const normalizeEgyptianPhone = (value = '') => {
  let phone = normalizeDigits(value).replace(/\D/g, '');

  if (phone.startsWith('0020')) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith('20') && phone.length === 12) {
    phone = `0${phone.slice(2)}`;
  }

  return phone;
};

module.exports = {
  normalizeDigits,
  normalizeEgyptianPhone
};
