export default class AssetManager {
    constructor() {
        this.images = {};
    }

    loadImage(key, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Erreur de chargement pour l'image: ${url}`);
                reject(new Error(`Failed to load image at ${url}`));
            };
            img.src = url;
        });
    }

    loadAll(manifest) {
        const promises = manifest.map(item => this.loadImage(item.key, item.url));
        return Promise.all(promises);
    }

    getImage(key) {
        return this.images[key];
    }
}
