# Компактные столы · 2.13

Для режима без персонажей подготовлены две новые текстуры встроенным imagegen в режиме `precise-object-edit`. Прежние небольшие фрагменты столов 2.12 использованы как цели правки: сохранены тёплая древесина костей и тёмно-зелёное сукно покера, добавлены чёткие детали материала. Сцен с комнатой и персонажем эта замена не касается.

| Файл | Размер | Назначение |
|---|---|---|
| `assets/dice-compact-table-v2.webp` | 1024 × 1024, RGB | Чёткая деревянная столешница костей |
| `assets/poker-compact-felt-v2.webp` | 1024 × 1024, RGB | Чёткое зелёное сукно покера |

Оба результата уменьшены с 1254 × 1254 до 1024 × 1024 и экспортированы в WebP с качеством 94. Размеры рассчитаны на небольшое окно с высокой плотностью пикселей; узкая полоса старого сукна больше не растягивается на всю высоту стола. Текстуры показываются только при снятой галочке соответствующей игры. Старые `dice-compact-table.webp` и `poker-compact-felt.webp` заменены; прежние фоновые сцены и все портреты сохранены.

Исходники: `generated_images/exec-126acccb-1133-4db6-a253-527f971ebc26.png` и `generated_images/exec-694eedf8-c75d-4035-b84c-e6ce7ef929fc.png`. Они не включены в ZIP; игре нужны только подготовленные WebP. Декораций, фигур или интерфейса на самих текстурах нет: кости, карты и управление остаются элементами игры.

## Дерево

```text
Use case: precise-object-edit.
Asset type: sharp full-resolution square tabletop material for an existing dice mini-game, used only in its compact mode without a character.
INPUT IMAGE 1 is the EDIT TARGET: the current amber-brown wooden table texture. Preserve its warm tavern wood palette and horizontal plank direction, but rebuild the material cleanly at high resolution so the wood grain and narrow plank seams are crisp instead of smeared or blurred.
Make a full-bleed SQUARE 1024 by 1024 image of only a close-up flat wooden tabletop, viewed straight from above: warm medium-dark walnut / honey brown boards, naturally varied fine grain, a few subtle small knots, clean narrow horizontal joints, gentle amber illumination. Detailed and sharp across the entire surface, quiet enough for dice and UI to sit over it. A refined hand-painted game material with realistic wood detail; not chunky pixel art. Keep contrast controlled, no bright hotspot.
Constraints: ONLY the wood surface, edge-to-edge. No table edge, room, character, hands, dice, playing pieces, cards, accessories, text, labels, border, watermark, perspective horizon, drop shadows, depth-of-field, blur, blurry grain, dust or scratches that look like noise. This is an actual background material, not a mockup or screenshot.
```

## Сукно

```text
Use case: precise-object-edit.
Asset type: sharp full-resolution square felt material for an existing premium poker mini-game, used only in its compact mode without a character.
INPUT IMAGE 1 is the EDIT TARGET: the current bottle-green poker felt. Preserve its refined deep green hue and restrained light, but rebuild the actual cloth weave at high resolution so it stays clear and finely detailed on a high-density phone screen rather than looking magnified and blurred.
Make a full-bleed SQUARE 1024 by 1024 top-down close-up of ONLY premium deep emerald / bottle-green poker table wool felt. Tiny precise, very subtle woven fibers and soft fine nap are evenly readable over the ENTIRE image, with restrained contrast. Calm even studio-like table light with a very gentle darker lower edge, no strong vignette and no white highlights. Realistic high-quality game material, crisp focus throughout, uniform material scale, no coarse exaggerated crosshatch or noisy artificial dots.
Constraints: ONLY green cloth, edge-to-edge. No table rim, leather rail, wood, brass, room, people, hands, cards, chips, symbols, betting lines, text, logos, border, watermark, perspective horizon, depth-of-field, blur, blurry patches or oversharpening halos. This is an actual UI background material, not a screenshot or mockup.
```
