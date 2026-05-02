/**
 * h1 — Renderer3D
 * Remplace le Canvas 2D par une scène Three.js WebGL.
 * Caméra 3ème personne style Fortnite/Roblox.
 */
const THREE = window.THREE;

export default class Renderer3D {
    constructor(containerId) {
        // Scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Caméra perspective (style Fortnite)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 12, -8);
        this.camera.lookAt(0, 0, 0);

        // Cible de la caméra (position lerp)
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraOffset = new THREE.Vector3(0, 12, -8); // Derrière et au-dessus
        this.cameraLerpFactor = 0.08;

        // Renderer WebGL
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;

        // Insérer dans le DOM (remplace le canvas 2D visuellement)
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none'; // Cacher le canvas 2D
        }
        document.body.insertBefore(this.renderer.domElement, document.body.firstChild);
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';

        // Éclairage de base
        this.ambientLight = new THREE.AmbientLight(0x111111, 0.5);
        this.scene.add(this.ambientLight);

        // Lampe torche du joueur (SpotLight)
        this.playerLight = new THREE.SpotLight(0xffd699, 2, 18, Math.PI / 4, 0.5, 1.5);
        this.playerLight.castShadow = true;
        this.playerLight.shadow.mapSize.width = 512;
        this.playerLight.shadow.mapSize.height = 512;
        this.playerLight.shadow.camera.near = 0.5;
        this.playerLight.shadow.camera.far = 20;
        this.scene.add(this.playerLight);
        this.scene.add(this.playerLight.target);

        // Point light supplémentaire pour éclairage local doux
        this.playerPointLight = new THREE.PointLight(0xffd699, 0.8, 10);
        this.scene.add(this.playerPointLight);

        // Resize
        window.addEventListener('resize', () => this._onResize());
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Mettre à jour la caméra pour suivre le joueur (style Fortnite).
     * @param {number} playerX - Position X du joueur (grille)
     * @param {number} playerY - Position Z du joueur (grille, Y en 2D = Z en 3D)
     */
    updateCamera(playerX, playerY) {
        // En 3D : X = X grille, Z = Y grille (car Y 3D = hauteur)
        const targetPos = new THREE.Vector3(playerX, 0, playerY);
        
        // Lerp de la cible
        this.cameraTarget.lerp(targetPos, this.cameraLerpFactor);

        // Position caméra = cible + offset
        const desiredPos = this.cameraTarget.clone().add(this.cameraOffset);
        this.camera.position.lerp(desiredPos, this.cameraLerpFactor);
        this.camera.lookAt(this.cameraTarget.x, 1, this.cameraTarget.z);

        // Mettre à jour la lampe torche
        this.playerLight.position.set(this.cameraTarget.x, 3, this.cameraTarget.z);
        this.playerLight.target.position.set(
            this.cameraTarget.x, 
            0, 
            this.cameraTarget.z + 3 // Éclaire devant le joueur
        );
        this.playerPointLight.position.set(this.cameraTarget.x, 2, this.cameraTarget.z);
    }

    /**
     * Flicker de la lampe torche.
     */
    updateLightFlicker(time) {
        const flicker = 1.8 + Math.sin(time * 5) * 0.2 + Math.sin(time * 13) * 0.1;
        this.playerLight.intensity = flicker;
        this.playerPointLight.intensity = flicker * 0.4;
    }

    /**
     * Configurer le fog selon le thème de la map.
     */
    setFog(color, density) {
        this.scene.fog = new THREE.FogExp2(color, density);
        this.scene.background = new THREE.Color(color);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Nettoyer tous les objets de la scène (sauf lumières).
     */
    clearScene() {
        const toRemove = [];
        this.scene.traverse(child => {
            if (child !== this.scene && 
                child !== this.ambientLight && 
                child !== this.playerLight && 
                child !== this.playerLight.target &&
                child !== this.playerPointLight &&
                !(child instanceof THREE.Light)) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            this.scene.remove(obj);
        });
    }
}
