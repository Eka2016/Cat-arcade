# Кубики ДНД · 2.26

В меню игр → «Настройки чата» → «Кубик d20» доступны **Лесной** и **Деревянный**. Лесной — прежний зелёный кубик, выбранный по умолчанию для существующих установок. Деревянный — отдельная иллюстрация с собственными резными цифрами и знаками.

Выбор хранится в стандартных настройках расширения (`dndDieStyle`: `forest` или `wood`). Смена оформления не меняет текущий набор, выбранное событие, результат, пресет или сборники. Она не делает запрос к модели. Выбор сохраняется при перезагрузке; если сохранение недоступно, возвращается предыдущий вариант и появляется короткое сообщение.

## Лесной кубик · 2.19

Основа расширения — присланный архив Paw-Arcade-v2.17(1).zip. Анимации персонажей сохранены из этой версии.

Новый ресурс: `assets/dnd-jade-die-v1.webp`, 512 × 512, RGBA. Подготовлен встроенным ImageGen с настоящей прозрачностью по фото пользователя и свету существующего пенька. Это отдельный нарисованный объект, фон игры не заменялся. Результат генерации уменьшен и упакован в WebP с качеством 95; прозрачность сохранена. Исходник рабочего процесса: `generated_images/exec-1136381a-dd06-4be4-b7eb-97090069227b.png`.

Крупная центральная грань оставлена без цифры в иллюстрации: значение накладывает существующий интерфейс игры. Поэтому 1–20, знак ожидания и промежуточные состояния обновляются после броска, а не остаются частью картинки. Изображение загружается из той же папки расширения; автономный demo.html содержит его внутри себя. Для появления изображения не используется запрос к модели.

Меню сохраняет встроенные SVG: обновлённый чёрный конь и зелёный d20 с золотыми рёбрами. Они не требуют загрузки отдельных изображений.

## Промт встроенного ImageGen

Use case: stylized-concept. Asset type: ONE isolated transparent game sprite of a twenty-sided D20 die, used as a real clickable game object over an existing forest-stump background. Input image 1 is the DESIGN REFERENCE: a dark green-black icosahedral die with aged golden numerals and green mineral highlights. Input image 2 is a LIGHTING / PALETTE reference only: warm forest sunlight on a tree stump. Create a refined hand-painted fantasy illustration of this kind of die, not a photograph or glossy product render. Deep forest-jade and near-black stone triangular faces, subtly translucent emerald veins, thin worn antique-brass edges, a few natural brush textures, soft amber upper-left sunlight. The stone should read green with volume and clear clean edges, no neon glow. Composition: a single large symmetrical three-quarter-view icosahedron centered on a square transparent canvas, the die occupies about 84 percent of the image, all vertices inside the frame with clear margin. A prominent triangular FRONT face points upward and faces the viewer nearly straight on, large enough to display a readable game number. IMPORTANT: keep the FRONT CENTER TRIANGULAR FACE completely BLANK with a quiet smooth dark emerald surface, without a printed number, symbol, decoration or glare; the running game will place its changing number there. Small subtly engraved gold numerals may appear on the side faces, like 2, 8 and 14, respecting each face orientation. Preserve the reference's tasteful dark-green-and-gold feeling, but make the object visibly illustrated and harmonize with warm wood and forest moss. No chain, no pendant loop, no hooks, no stand, no hands, no stump or scenery in the output, no background rectangle, no background checkerboard, no text outside the die, no watermark. Actual transparent alpha background surrounding the whole object; no cast ground plane. Keep the front face simple and legible at small game UI size.


## Центральные цифры · 2.21

Встроенный ImageGen создал отдельный прозрачный атлас `assets/dnd-gold-numerals-v1.png` (1983 × 793, RGBA): 0–4 в первом ряду, 5–9 во втором. Оригинальные пиксели результата сохранены без перерисовки и кадрирования. Изолированные символы вместе составляют значения 1–20. Иллюстрация самого кубика и его боковые грани сохранены.

`dnd-numerals.js` показывает нужные участки атласа через SVG-окна. Для каждого знака измерены видимые границы, поэтому пробелы исходной ячейки не смещают результат. У всех знаков одинаковая видимая высота; целое число центрируется на координатах (80, 77.5) внутри вида 160 × 160, соответствующих центру передней грани. В 2.21 знаки ожидания оставались текстовыми; начиная с 2.22 они используют отдельный атлас, описанный ниже. Если ресурс не загрузился, обычная цифра остаётся читаемой вместо пустой грани. Автономный demo.html включает атлас внутрь себя.

Исходник генерации: `generated_images/exec-14d2d722-85c3-4275-a53a-15af528e6cde.png`. Генерация выполнена встроенным ImageGen. Для использования изображений в игре обращения к модели не нужны.

### Промт атласа

Use case: stylized-concept. Asset type: one transparent numeral glyph atlas for an illustrated fantasy emerald D20 game; 10 isolated golden glyphs used as interchangeable numbers on the die. The emerald D20 is a STYLE reference only. Match the warm antique polished brass / gold, engraved beveled serif numerals on the existing numbered faces. Exactly ten separate Arabic numeral glyphs, one regular 5-column by 2-row atlas. Reading left to right: top row 0, 1, 2, 3, 4; bottom row 5, 6, 7, 8, 9. Each glyph centered in its equal-sized cell. Identical cap height and material, front-facing perspective, sharp classical serif lettering. Softly textured painterly gold bevel, dark bronze inner bevel, warm highlighted upper-left edge. The 2, 4 and 8 should match the reference die. Upright, no rotation. Generous transparent gutters, no overlap. Actual alpha transparency. No cells, borders, labels, extra letters, punctuation, flourishes, die, stone, backing plate, fake checkerboard, outer drop shadow or watermark.

## Знаки ожидания · 2.22

Встроенный ImageGen создал `assets/dnd-gold-symbols-v1.png` (1983 × 793, RGBA) по стилю предыдущего атласа цифр. Исходник: `generated_images/exec-43d1bf2c-2afc-481a-8619-6e8c6de5178d.png`. PNG включён без перерисовки или кадрирования: SVG-окна показывают вопросительный знак, многоточие и точку броска. Знаки центрируются там же, где числа; точки имеют одинаковый диаметр. Атлас включён и в автономный demo.html. Для показа знаков запрос к модели не нужен.

### Промт встроенного ImageGen

Use case: stylized-concept
Asset type: one transparent game sprite atlas of exactly THREE punctuation symbols, matching the attached numeral atlas.
Input image is a STYLE REFERENCE: keep the same warm polished antique gold and dark bronze beveled edges, softly textured painterly highlights, bold classical serif carving, sharp crisp illustrated metal. Produce punctuation only, not numerals.
Composition: a wide horizontal strip of THREE equal square cells, generous transparent gutters; each symbol centered inside its own cell. Left cell: one upright QUESTION MARK '?' with its detached round dot beneath. Middle cell: an ELLIPSIS '…' formed by exactly three equal, clearly separated small round golden dots in a horizontal line. Right cell: exactly one circular middle dot '·'. Three cells are equally wide. The question mark should have the same physical cap height and stroke thickness as the reference numerals. The ellipsis dots and single dot should be the same diameter, about one tenth of the question mark height, with the line of dots optically centered in its cell. Exact recognizable punctuation. Upper-left golden edge highlights, restrained bronze shadow integrated into the bevel.
Text (verbatim): ?   …   ·
Constraints: genuine transparent alpha background; no die, no background surface, no backing plates, no cell outlines or labels, no extra dots or symbols, no digits, no typography specimen title, no watermark, no fake checkerboard. Do not repeat the question mark. All symbols front-facing, upright and unrotated.



## Деревянный кубик · 2.26

Три новых изображения созданы встроенным ImageGen. CLI и отдельный API для генерации графики не использовались. Центральная грань кубика оставлена пустой, цифры и знаки накладывает интерфейс.

| Файл | Размер | Подготовка |
| --- | --- | --- |
| `assets/dnd-wood-die-v1.webp` | 1254 × 1254, RGBA | WebP quality 94, method 6, исходное разрешение и alpha сохранены |
| `assets/dnd-wood-numerals-v1.png` | 1983 × 793, RGBA | PNG генерации без изменения байтов |
| `assets/dnd-wood-symbols-v1.png` | 1983 × 793, RGBA | PNG генерации без изменения байтов |

Исходники: `generated_images/exec-40986bf8-93de-41d4-8c22-190170544540.png`, `generated_images/exec-009803a3-b2dc-4935-a3c4-c23643c20bbd.png`, `generated_images/exec-7fed7660-35fc-48fa-848e-44d3620b4c62.png`.

Атлас цифр содержит 0–4 сверху и 5–9 снизу. Атлас знаков содержит вопросительный знак с нижней точкой, многоточие из трёх точек и одну точку броска. Поддержаны все используемые состояния: ожидание `?`, генерация `…`, бросок `·`, результаты 1–20.

Видимые границы каждого деревянного знака измерены отдельно по alpha > 32; мелкие изолированные частицы вне основного рисунка не учитываются при измерении. Ресурсы не обрезаются: SVG-окна показывают нужный участок. Все деревянные результаты центрируются в (79, 77) вида 160 × 160, с одинаковой видимой высотой цифр. Лесной комплект сохранил прежние изображения, границы и координаты (80, 77.5).

При смене вида загрузчики предыдущего атласа отключаются; запоздалые ответы не рисуют старые знаки поверх нового вида. Пока рисунок загружается или если он недоступен, остаётся читаемый текстовый символ в подходящем цвете. Уничтожение интерфейса отключает загрузчики. Все ресурсы локальные, в автономном `demo.html` они встроены как data URL.

Проверено: оба вида на четырёх размерах окна, сохранение и восстановление, все цифры 1–20 и три знака, переключение во время генерации, сохранение событий и результата, локальный переброс, разделение наборов между чатами, ошибка сохранения, запоздалая загрузка и очистка обработчиков. Проверки интеграции используют локальную имитацию API Таверны; автономный предпросмотр не делает HTTP-запросов.

### Промпт деревянного кубика

```text
Use case: precise-object-edit
Asset type: transparent game sprite for a wooden DND d20, square.
Primary request: Recreate the supplied green forest d20 as a WOODEN twenty-sided die carved from one solid piece of wood. Keep the EXACT SAME silhouette, camera angle, triangle geometry, scale, placement and illustrated finish so it can replace the sprite in the same UI. This is a new alternate appearance; the green original stays available.
Input image: The supplied jade-and-gold d20 is the geometric/edit reference. Change its material ONLY to warm carved natural wood and matching engraved numerals. Keep the camera directly facing the large central triangular face.
Shape and placement: Square canvas. A single regular icosahedral d20, centered, fully visible, narrow transparent margin. Same top vertex, six-sided outside outline and prominent central upright triangular face as the reference. The EMPTY central triangle's vertices should be approximately (50% width,16% height), (23% width,65% height), (77% width,65% height). Its center is near (50%,48.5%), where the app will overlay the rolled number.
Material: One solid piece of medium warm oak/walnut with visible natural fibers and restrained growth-ring figure across faces. Crisp hand-cut triangular facets, softly worn corners, subtle knife/tool marks. Every old gold structural rib becomes a narrow WOODEN bevel / cut into the wood, no metallic edging. The side faces have a few clearly carved / burned-in DARK BROWN numbers as in the reference (2, 14, 8 and partial side numerals), with a thin lighter fresh-wood cut edge that sells the engraving. Side numerals should be large enough to recognize but not compete with the center. Optional extremely restrained incised leaf mark on a small upper face only.
CRITICAL: The ENTIRE LARGE CENTRAL UPRIGHT TRIANGULAR FACE must be completely unnumbered, blank warm medium-brown wood, no letters, no symbol, no logo, no 20 — the program renders the current result on it. Preserve this exact central face area unobscured.
Style/lighting: detailed hand-painted illustrative fantasy game asset, same finish as the supplied sprite, subtly shaded, tactile wood, not cartoon, not toy/cute, not a photographic product scene. Gentle diffuse light from upper left, natural brown variation between facets. The central face is warm medium tan so dark engraved number overlays read clearly.
Constraints: NO gold, NO metal, NO green stone/jade, NO gem/crystal, NO moss covering wood, NO cartoon creatures, NO characters, NO separate objects or background/table/stump. TRUE transparent outside the die with preserved alpha, no black/white/checkerboard background and no background shadow baked into the canvas. Do not crop the die.
```

### Промпт деревянных цифр

```text
Use case: precise-object-edit
Asset type: transparent digit sprite atlas for a wooden d20 game die.
Primary request: Change ONLY the MATERIAL of the supplied golden digit atlas into CARVED NATURAL WOOD that matches the supplied wooden d20. Keep all ten original digit designs, order, positions, spacing, height, serif shapes and the 5-column × 2-row atlas layout. This is a texture/material edit, not a typography redesign.
Input images: first = authoritative digit atlas/layout/edit target, second = wooden die material/lighting reference.
Text (verbatim): top row "0 1 2 3 4", bottom row "5 6 7 8 9". Exactly one glyph per cell, ten glyphs total. No labels, no additional text.
Layout: Wide 5:2 landscape canvas matching the original atlas (1983×793 if possible). Each row contains FIVE evenly spaced separated characters, aligned to their original cells. The whole glyph including every serif remains inside its cell with generous transparent gutters. Keep top row near y=50..365 and bottom row near y=430..745 in the original coordinate system. Preserve original 0–9 proportions. No overlapping.
Material/appearance: Every digit is hand-carved WOODEN RELIEF lettering from the same oak/walnut as the die, with DARK WALNUT BROWN main stroke interiors, visible fine wood fibers, narrow lighter fresh-cut oak bevels and subtle dark inner cut shadows. It must look like naturally carved wooden numbers, not gold foil/metal. The warm LIGHT oak bevel is small and restrained; center of strokes medium-to-dark brown gives clear contrast on the medium tan wooden die face. Hand-painted detailed illustration, same softly shaded style as the die. Relief thickness shallow so letters feel carved into or from the wood rather than plastic stickers.
Constraints: Absolutely NO gold metal, NO metallic yellow, NO amber crystal, NO green, NO bright neon or white glow. NO tiles/wooden squares or plates behind the digits, NO rectangular backgrounds, NO unrelated ornaments. TRUE TRANSPARENT alpha around each individual glyph and inside holes (0,6,8,9,4). No floor/background/shadow scene, no checkerboard pattern. Keep all ten glyphs crisp and fully visible and preserve the exact 5×2 ordering.
```

### Промпт деревянных знаков

```text
Use case: precise-object-edit
Asset type: transparent punctuation sprite atlas for a hand-carved wooden DND die.
Primary request: Change ONLY the MATERIAL of the supplied gold punctuation atlas to the natural carved WOOD of the supplied wooden digit atlas and wooden d20. Keep every original glyph shape, position, proportion, spacing and layout.
Input images: first is the gold SYMBOL ATLAS / EDIT TARGET (authoritative punctuation geometry); second is the new WOODEN DIGIT atlas for exact material/color/bevel style; third is the wooden die.
Text (verbatim): "?" at the left (a complete question mark with its separate circular dot beneath), "…" at the center (exactly THREE same-size round dots in one horizontal line), "·" at the right (exactly ONE round dot). These are THREE separate sprite groups, no other glyphs.
Layout: Same wide 5:2 transparent canvas as the original (1983×793 if possible). Big question mark stays in the left third at the original size and y position; full question mark INCLUDING its bottom dot fully visible. Three-dot ellipsis stays centered, around original y=440. Single round dot stays in the right third, same height and size as ellipsis dots. Generous transparent separation between the three groups.
Material: dark-to-medium walnut brown carved wooden relief glyphs with fine natural wood fibers, narrow lighter fresh-cut oak bevel, softly painted recessed/edge shadows. Same material and lighting as the NEW wood digits. No metallic gold or bronze; warm beige oak highlights are restrained and thin, interiors darker brown for contrast on the die's tan face.
Style: detailed illustrative fantasy wood carving, matching supplied wooden digits exactly. Clear crisp silhouettes, no cartoon or toys.
Constraints: Preserve actual TRUE transparency around shapes and in question-mark holes. NO wood rectangles/plaques or background behind the glyphs, NO additional dots beyond the required question-mark dot, three ellipsis dots, one isolated dot. NO letters, NO numbers, NO other punctuation, NO text labels, NO UI icons, NO logo, NO props/table/background/shadow scene. No green/jade, no metal/gold, no colored glow. Do not crop or overlap any glyph.
```
