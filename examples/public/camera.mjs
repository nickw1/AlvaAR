import * as THREE from 'three'; 
import { Stats, AlvaAR, ARCamView, Camera, onFrame, resize2cover } from 'alva-js';

function main()
{
    const config = {
        video: {
            facingMode: 'environment',
            aspectRatio: 16 / 9,
            width: { ideal: 1280 }
        },
        audio: false
    }

    const $container = document.getElementById( 'container' );
    const $view = document.createElement( 'div' );
    const $canvas = document.createElement( 'canvas' );
    const $overlay = document.getElementById( 'overlay' );
    const $start = document.getElementById( 'start_button' );
    const $splash = document.getElementById( 'splash' );
    const splashFadeTime = 800;

    $splash.style.transition = `opacity ${ splashFadeTime / 1000 }s ease`;
    $splash.style.opacity = 0;

    async function demo( media )
    {
        const $video = media.el;

        const size = resize2cover( $video.videoWidth, $video.videoHeight, $container.clientWidth, $container.clientHeight );

        $canvas.width = $container.clientWidth;
        $canvas.height = $container.clientHeight;
        $video.style.width = size.width + 'px';
        $video.style.height = size.height + 'px';

        const ctx = $canvas.getContext( '2d', { alpha: false, desynchronized: true } );
        const alva = await AlvaAR.Initialize( $canvas.width, $canvas.height );
        const view = new ARCamView( $view, $canvas.width, $canvas.height );
        const object = new THREE.Mesh( new THREE.IcosahedronGeometry( 1, 0 ), new THREE.MeshNormalMaterial( { flatShading: true } ) );
        object.visible = false;
        view.addObject( object );

        Stats.add( 'total' );
        Stats.add( 'video' );
        Stats.add( 'slam' );

        $container.appendChild( $canvas );
        $container.appendChild( $view );

        document.body.appendChild( Stats.el );
        document.body.addEventListener( "click", () => alva.reset(), false );

        onFrame( () =>
        {
            Stats.next();
            Stats.start( 'total' );

            ctx.clearRect( 0, 0, $canvas.width, $canvas.height );

            if( !document['hidden'] )
            {
                Stats.start( 'video' );
                ctx.drawImage( $video, 0, 0, $video.videoWidth, $video.videoHeight, size.x, size.y, size.width, size.height );
                const frame = ctx.getImageData( 0, 0, $canvas.width, $canvas.height );
                Stats.stop( 'video' );

                Stats.start( 'slam' );
                const pose = alva.findCameraPose( frame );
                Stats.stop( 'slam' );

                if( pose )
                {
                    view.updateCameraPose( pose );
                }
                else
                {
                    view.lostCamera();

                    const dots = alva.getFramePoints();

                    for( const p of dots )
                    {
                        ctx.fillStyle = 'white';
                        ctx.fillRect( p.x, p.y, 2, 2 );
                    }
                }
            }

            Stats.stop( 'total' );
            Stats.render();

            return true;
        }, 30 );
    }

    setTimeout( () =>
    {
        $splash.remove();

        $start.addEventListener( 'click', () =>
        {
            $overlay.remove();

            Camera.Initialize( config ).then( media => demo( media ) ).catch( error => alert( 'Camera ' + error ) );

        }, { once: true } );

    }, splashFadeTime );
}

window.addEventListener( 'load', main );
