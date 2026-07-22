import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, 'src', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const collections = {
  posts: { en: "Posts", fr: "Articles", es: "Entradas", de: "Beiträge", pt: "Postagens" },
  pages: { en: "Pages", fr: "Pages", es: "Páginas", de: "Seiten", pt: "Páginas" },
  categories: { en: "Categories", fr: "Catégories", es: "Categorías", de: "Kategorien", pt: "Categorias" },
  forms: { en: "Forms", fr: "Formulaires", es: "Formularios", de: "Formulare", pt: "Formulários" },
  formentries: { en: "Form Entries", fr: "Entrées de Formulaire", es: "Entradas de Formulario", de: "Formulareinträge", pt: "Entradas de Formulário" },
  products: { en: "Products", fr: "Produits", es: "Productos", de: "Produkte", pt: "Produtos" },
  customers: { en: "Customers", fr: "Clients", es: "Clientes", de: "Kunden", pt: "Clientes" },
  orders: { en: "Orders", fr: "Commandes", es: "Pedidos", de: "Bestellungen", pt: "Pedidos" },
  coupons: { en: "Coupons", fr: "Coupons", es: "Cupones", de: "Gutscheine", pt: "Cupons" },
  reviews: { en: "Reviews", fr: "Avis", es: "Reseñas", de: "Bewertungen", pt: "Avaliações" },
  brands: { en: "Brands", fr: "Marques", es: "Marcas", de: "Marken", pt: "Marcas" },
  carts: { en: "Carts", fr: "Paniers", es: "Carritos", de: "Warenkörbe", pt: "Carrinhos" },
  media: { en: "Media", fr: "Médias", es: "Medios", de: "Medien", pt: "Mídia" },
  menu: { en: "Menu", fr: "Menu", es: "Menú", de: "Menü", pt: "Menu" }
};

const groups = {
  content: { en: "Content", fr: "Contenu", es: "Contenido", de: "Inhalt", pt: "Conteúdo" },
  ecommerce: { en: "E-commerce", fr: "E-commerce", es: "Comercio Electrónico", de: "E-Commerce", pt: "E-commerce" },
  system: { en: "System", fr: "Système", es: "Sistema", de: "System", pt: "Sistema" },
  settings: { en: "Settings", fr: "Paramètres", es: "Ajustes", de: "Einstellungen", pt: "Configurações" }
};

files.forEach(file => {
  const lang = path.basename(file, '.json');
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  data.collections = data.collections || {};
  Object.keys(collections).forEach(key => {
    data.collections[key] = collections[key][lang] || collections[key].en;
  });

  data.groups = data.groups || {};
  Object.keys(groups).forEach(key => {
    data.groups[key] = groups[key][lang] || groups[key].en;
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});
console.log("Updated locales!");
