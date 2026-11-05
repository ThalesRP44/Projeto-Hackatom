import React, { useEffect, useState } from 'react';

// Input reutilizável para fotos: valida o tamanho e exibe uma prévia local.
// A URL temporária é liberada quando a foto muda ou o componente sai da tela.
export default function Photo({ name, title, required, onChange }) {
  const [preview, setPreview] = useState(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  return (
    <label className="photo">
      <span>
        {title}
        {required ? ' *' : ' · opcional'}
      </span>
      {preview && <img src={preview} alt={`Prévia: ${title}`} />}
      <input
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        required={required}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file && file.size > 5 * 1024 * 1024) {
            e.target.value = '';
            setPreview(null);
            onChange?.(null);
            e.target.setCustomValidity('A foto deve ter no máximo 5 MB.');
            e.target.reportValidity();
            return;
          }
          e.target.setCustomValidity('');
          setPreview(file ? URL.createObjectURL(file) : null);
          onChange?.(file || null);
        }}
      />
      <small>JPEG, PNG ou WebP · até 5 MB</small>
    </label>
  );
}
